package main

import (
	"context"
	"fmt"
	"log"
	"time"

	awsconfig "github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/cloudwatch"
	cwtypes "github.com/aws/aws-sdk-go-v2/service/cloudwatch/types"
)

// GPU instance type prefixes to filter for.
var gpuInstancePrefixes = []string{
	"p4d", "p4de", "p5", "p5e",
	"g5", "g5g", "g6", "g6e",
	"dl1", "dl2q",
	"trn1", "trn1n", "inf2",
}

// GPUMetricsCollector collects GPU utilization metrics from CloudWatch.
type GPUMetricsCollector struct {
	cfg    *Config
	writer *EventWriter
	client *cloudwatch.Client
}

// NewGPUMetricsCollector creates a new CloudWatch GPU metrics collector.
func NewGPUMetricsCollector(cfg *Config, writer *EventWriter) (*GPUMetricsCollector, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	awsCfg, err := awsconfig.LoadDefaultConfig(ctx, awsconfig.WithRegion(cfg.AWSRegion))
	if err != nil {
		return nil, fmt.Errorf("loading AWS config: %w", err)
	}

	client := cloudwatch.NewFromConfig(awsCfg)

	return &GPUMetricsCollector{
		cfg:    cfg,
		writer: writer,
		client: client,
	}, nil
}

// Collect queries CloudWatch for GPU-related metrics and writes cost events.
func (c *GPUMetricsCollector) Collect(ctx context.Context) error {
	now := time.Now().UTC()
	startTime := now.Add(-10 * time.Minute)

	// Query for custom GPU utilization metrics (DCGM / nvidia-smi).
	// These are typically published as custom CloudWatch metrics.
	gpuMetricNames := []string{
		"nvidia_smi_utilization_gpu",
		"DCGM_FI_DEV_GPU_UTIL",
		"GPUUtilization",
	}

	var events []CostEvent

	for _, metricName := range gpuMetricNames {
		input := &cloudwatch.ListMetricsInput{
			MetricName: &metricName,
		}

		result, err := c.client.ListMetrics(ctx, input)
		if err != nil {
			log.Printf("WARN: could not list CloudWatch metric %q: %v", metricName, err)
			continue
		}

		if len(result.Metrics) == 0 {
			continue
		}

		log.Printf("INFO: found %d CloudWatch metrics for %q", len(result.Metrics), metricName)

		for _, metric := range result.Metrics {
			// Extract instance ID and other dimensions.
			instanceID := ""
			for _, dim := range metric.Dimensions {
				if dim.Name != nil && *dim.Name == "InstanceId" && dim.Value != nil {
					instanceID = *dim.Value
				}
			}

			// Get the metric statistics.
			statsInput := &cloudwatch.GetMetricStatisticsInput{
				Namespace:  metric.Namespace,
				MetricName: metric.MetricName,
				Dimensions: metric.Dimensions,
				StartTime:  &startTime,
				EndTime:    &now,
				Period:     int32Ptr(300), // 5-minute periods
				Statistics: []cwtypes.Statistic{cwtypes.StatisticAverage},
			}

			statsResult, err := c.client.GetMetricStatistics(ctx, statsInput)
			if err != nil {
				log.Printf("WARN: could not get stats for metric %q: %v", metricName, err)
				continue
			}

			for _, dp := range statsResult.Datapoints {
				if dp.Average == nil {
					continue
				}

				event := CostEvent{
					EventID:           fmt.Sprintf("gpumetric-%s-%s-%d", instanceID, metricName, dp.Timestamp.UnixNano()),
					Timestamp:         dp.Timestamp.Format(time.RFC3339),
					EventType:         "gpu_compute",
					Provider:          "aws",
					Service:           "gpu_metrics",
					Model:             "",
					CostUSD:           0, // Utilization metric only, cost from Cost Explorer
					ResourceID:        instanceID,
					Region:            c.cfg.AWSRegion,
					GPUUtilizationPct: *dp.Average,
				}

				events = append(events, event)
			}
		}
	}

	// Also query CPUUtilization for context on GPU instances.
	// This helps identify underutilized GPU instances.
	cpuInput := &cloudwatch.GetMetricStatisticsInput{
		Namespace:  strPtr("AWS/EC2"),
		MetricName: strPtr("CPUUtilization"),
		StartTime:  &startTime,
		EndTime:    &now,
		Period:     int32Ptr(300),
		Statistics: []cwtypes.Statistic{cwtypes.StatisticAverage},
	}

	cpuResult, err := c.client.GetMetricStatistics(ctx, cpuInput)
	if err != nil {
		log.Printf("WARN: could not get EC2 CPUUtilization: %v", err)
	} else if len(cpuResult.Datapoints) > 0 {
		log.Printf("INFO: found %d CPUUtilization datapoints", len(cpuResult.Datapoints))
	}

	if len(events) > 0 {
		if err := c.writer.WriteEvents(events); err != nil {
			return fmt.Errorf("writing GPU metric events: %w", err)
		}
		log.Printf("INFO: wrote %d GPU metric events", len(events))
	} else {
		log.Printf("INFO: no GPU metrics found in CloudWatch (this is normal if no custom GPU metrics are published)")
	}

	return nil
}

func strPtr(s string) *string {
	return &s
}

func int32Ptr(i int32) *int32 {
	return &i
}
