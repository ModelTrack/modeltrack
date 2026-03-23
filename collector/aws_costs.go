package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"os"
	"strconv"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	awsconfig "github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/costexplorer"
	cetypes "github.com/aws/aws-sdk-go-v2/service/costexplorer/types"
)

// AI-related AWS services to track.
var aiServices = []string{
	"Amazon SageMaker",
	"Amazon Bedrock",
	"Amazon EC2",
}

// CollectorState tracks what has been imported to avoid duplicates.
type CollectorState struct {
	LastAWSCollection map[string]string `json:"last_aws_collection"` // service -> last date collected
}

// AWSCostCollector collects cost data from AWS Cost Explorer.
type AWSCostCollector struct {
	cfg    *Config
	writer *EventWriter
	client *costexplorer.Client
}

// NewAWSCostCollector creates a new AWS Cost Explorer collector.
func NewAWSCostCollector(cfg *Config, writer *EventWriter) (*AWSCostCollector, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	awsCfg, err := awsconfig.LoadDefaultConfig(ctx, awsconfig.WithRegion(cfg.AWSRegion))
	if err != nil {
		return nil, fmt.Errorf("loading AWS config: %w", err)
	}

	client := costexplorer.NewFromConfig(awsCfg)

	return &AWSCostCollector{
		cfg:    cfg,
		writer: writer,
		client: client,
	}, nil
}

// Collect queries AWS Cost Explorer and writes new cost events.
func (c *AWSCostCollector) Collect(ctx context.Context) error {
	state, err := c.loadState()
	if err != nil {
		log.Printf("WARN: could not load collector state, starting fresh: %v", err)
		state = &CollectorState{
			LastAWSCollection: make(map[string]string),
		}
	}

	now := time.Now().UTC()
	// Query from the start of the current month.
	startOfMonth := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, time.UTC)
	startDate := startOfMonth.Format("2006-01-02")
	endDate := now.Format("2006-01-02")

	// If we've collected before, only query from the last collection date.
	for _, svc := range aiServices {
		lastDate, ok := state.LastAWSCollection[svc]
		if ok && lastDate > startDate {
			startDate = lastDate
		}
	}

	if startDate >= endDate {
		log.Printf("INFO: AWS costs already collected up to %s, skipping", endDate)
		return nil
	}

	var allEvents []CostEvent

	// Build service filter.
	filterValues := make([]string, len(aiServices))
	copy(filterValues, aiServices)

	granularity := cetypes.Granularity(c.cfg.CostExplorerGranularity)

	input := &costexplorer.GetCostAndUsageInput{
		TimePeriod: &cetypes.DateInterval{
			Start: aws.String(startDate),
			End:   aws.String(endDate),
		},
		Granularity: granularity,
		Metrics:     []string{"UnblendedCost"},
		GroupBy: []cetypes.GroupDefinition{
			{
				Type: cetypes.GroupDefinitionTypeDimension,
				Key:  aws.String("SERVICE"),
			},
		},
		Filter: &cetypes.Expression{
			Dimensions: &cetypes.DimensionValues{
				Key:    cetypes.DimensionService,
				Values: filterValues,
			},
		},
	}

	result, err := c.client.GetCostAndUsage(ctx, input)
	if err != nil {
		return fmt.Errorf("querying Cost Explorer: %w", err)
	}

	for _, resultByTime := range result.ResultsByTime {
		periodStart := ""
		if resultByTime.TimePeriod != nil && resultByTime.TimePeriod.Start != nil {
			periodStart = *resultByTime.TimePeriod.Start
		}

		for _, group := range resultByTime.Groups {
			service := ""
			if len(group.Keys) > 0 {
				service = group.Keys[0]
			}

			costAmount := 0.0
			if metric, ok := group.Metrics["UnblendedCost"]; ok && metric.Amount != nil {
				costAmount, _ = strconv.ParseFloat(*metric.Amount, 64)
			}

			if costAmount <= 0 {
				continue
			}

			event := CostEvent{
				EventID:   fmt.Sprintf("aws-%s-%s-%d", service, periodStart, time.Now().UnixNano()),
				Timestamp: periodStart + "T00:00:00Z",
				EventType: "aws_infrastructure",
				Provider:  "aws",
				Service:   service,
				Model:     "",
				CostUSD:   costAmount,
				Region:    c.cfg.AWSRegion,
			}

			allEvents = append(allEvents, event)
		}
	}

	// Now query with tag grouping for team/app attribution.
	for _, tag := range c.cfg.CollectionTags {
		tagInput := &costexplorer.GetCostAndUsageInput{
			TimePeriod: &cetypes.DateInterval{
				Start: aws.String(startDate),
				End:   aws.String(endDate),
			},
			Granularity: granularity,
			Metrics:     []string{"UnblendedCost"},
			GroupBy: []cetypes.GroupDefinition{
				{
					Type: cetypes.GroupDefinitionTypeDimension,
					Key:  aws.String("SERVICE"),
				},
				{
					Type: cetypes.GroupDefinitionTypeTag,
					Key:  aws.String(tag),
				},
			},
			Filter: &cetypes.Expression{
				Dimensions: &cetypes.DimensionValues{
					Key:    cetypes.DimensionService,
					Values: filterValues,
				},
			},
		}

		tagResult, err := c.client.GetCostAndUsage(ctx, tagInput)
		if err != nil {
			log.Printf("WARN: failed to query Cost Explorer with tag %q: %v", tag, err)
			continue
		}

		for _, resultByTime := range tagResult.ResultsByTime {
			periodStart := ""
			if resultByTime.TimePeriod != nil && resultByTime.TimePeriod.Start != nil {
				periodStart = *resultByTime.TimePeriod.Start
			}

			for _, group := range resultByTime.Groups {
				service := ""
				tagValue := ""
				if len(group.Keys) >= 1 {
					service = group.Keys[0]
				}
				if len(group.Keys) >= 2 {
					tagValue = group.Keys[1]
				}

				costAmount := 0.0
				if metric, ok := group.Metrics["UnblendedCost"]; ok && metric.Amount != nil {
					costAmount, _ = strconv.ParseFloat(*metric.Amount, 64)
				}

				if costAmount <= 0 || tagValue == "" {
					continue
				}

				event := CostEvent{
					EventID:   fmt.Sprintf("aws-%s-%s-%s-%s-%d", service, tag, tagValue, periodStart, time.Now().UnixNano()),
					Timestamp: periodStart + "T00:00:00Z",
					EventType: "aws_infrastructure",
					Provider:  "aws",
					Service:   service,
					Model:     "",
					CostUSD:   costAmount,
					Region:    c.cfg.AWSRegion,
				}

				// Map tags to event fields.
				switch tag {
				case "team":
					event.Team = tagValue
				case "app":
					event.AppID = tagValue
				case "environment":
					event.Feature = tagValue // reuse feature field for environment
				}

				allEvents = append(allEvents, event)
			}
		}
	}

	if len(allEvents) > 0 {
		if err := c.writer.WriteEvents(allEvents); err != nil {
			return fmt.Errorf("writing AWS cost events: %w", err)
		}
		log.Printf("INFO: wrote %d AWS cost events", len(allEvents))
	} else {
		log.Printf("INFO: no new AWS cost data found")
	}

	// Update state.
	for _, svc := range aiServices {
		state.LastAWSCollection[svc] = endDate
	}
	if err := c.saveState(state); err != nil {
		log.Printf("WARN: could not save collector state: %v", err)
	}

	return nil
}

func (c *AWSCostCollector) loadState() (*CollectorState, error) {
	data, err := os.ReadFile(c.cfg.CollectorStateFile)
	if err != nil {
		if os.IsNotExist(err) {
			return &CollectorState{
				LastAWSCollection: make(map[string]string),
			}, nil
		}
		return nil, err
	}

	var state CollectorState
	if err := json.Unmarshal(data, &state); err != nil {
		return nil, err
	}
	if state.LastAWSCollection == nil {
		state.LastAWSCollection = make(map[string]string)
	}
	return &state, nil
}

func (c *AWSCostCollector) saveState(state *CollectorState) error {
	data, err := json.MarshalIndent(state, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(c.cfg.CollectorStateFile, data, 0o644)
}
