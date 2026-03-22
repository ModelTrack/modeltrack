#!/bin/bash
# Generates 30 days of realistic sample cost events for testing the dashboard
# Usage: ./scripts/seed-data.sh

set -e

DATA_DIR="${DATA_DIR:-./data}"
OUTPUT="$DATA_DIR/cost_events.jsonl"
mkdir -p "$DATA_DIR"

echo "Generating sample cost events → $OUTPUT"

python3 -c "
import json
import random
import uuid
from datetime import datetime, timedelta

teams = ['product', 'data-eng', 'platform', 'ml-research']
apps = {
    'product': ['chatbot', 'search', 'recommendations'],
    'data-eng': ['summarizer', 'classifier', 'etl-assistant'],
    'platform': ['code-review', 'incident-bot', 'docs-qa'],
    'ml-research': ['eval-harness', 'prompt-optimizer', 'benchmark']
}
features = {
    'chatbot': ['customer-support', 'sales-assist', 'onboarding'],
    'summarizer': ['doc-summary', 'email-digest', 'report-gen'],
    'search': ['semantic-search', 'hybrid-search'],
    'code-review': ['pr-review', 'security-scan'],
    'classifier': ['intent-detection', 'sentiment'],
    'recommendations': ['product-rec', 'content-rec'],
    'incident-bot': ['alert-triage', 'runbook-lookup'],
    'docs-qa': ['internal-qa', 'api-docs'],
    'etl-assistant': ['schema-gen', 'query-gen'],
    'eval-harness': ['model-eval', 'regression-test'],
    'prompt-optimizer': ['cost-optimize', 'quality-optimize'],
    'benchmark': ['latency-bench', 'accuracy-bench']
}
models = [
    ('claude-sonnet-4-6-20250514', 3.0, 15.0),
    ('claude-haiku-4-5-20241022', 0.80, 4.0),
    ('claude-opus-4-6-20250610', 15.0, 75.0),
]
customer_tiers = ['free', 'pro', 'enterprise', '']
now = datetime.utcnow()
events = []

for day_offset in range(30, 0, -1):
    day = now - timedelta(days=day_offset)
    # More traffic on weekdays
    is_weekday = day.weekday() < 5
    daily_requests = random.randint(80, 200) if is_weekday else random.randint(20, 60)
    # Trend: traffic increases over time
    daily_requests = int(daily_requests * (1 + (30 - day_offset) * 0.02))

    for _ in range(daily_requests):
        team = random.choice(teams)
        app = random.choice(apps[team])
        feature_list = features.get(app, ['default'])
        feature = random.choice(feature_list)
        model_name, input_price, output_price = random.choices(
            models, weights=[0.5, 0.4, 0.1]
        )[0]

        # Realistic token ranges by app type
        if 'summary' in feature or 'digest' in feature:
            input_tokens = random.randint(2000, 8000)
            output_tokens = random.randint(200, 800)
        elif 'search' in feature:
            input_tokens = random.randint(500, 2000)
            output_tokens = random.randint(50, 200)
        elif 'eval' in feature or 'bench' in feature:
            input_tokens = random.randint(1000, 5000)
            output_tokens = random.randint(500, 2000)
        else:
            input_tokens = random.randint(300, 3000)
            output_tokens = random.randint(50, 500)

        cost = (input_tokens / 1_000_000 * input_price) + (output_tokens / 1_000_000 * output_price)
        latency = int(output_tokens * random.uniform(8, 25) + random.randint(100, 500))
        is_streaming = random.random() > 0.3

        hour = random.randint(6, 22) if is_weekday else random.randint(10, 18)
        minute = random.randint(0, 59)
        second = random.randint(0, 59)
        ts = day.replace(hour=hour, minute=minute, second=second)

        event = {
            'event_id': str(uuid.uuid4()),
            'timestamp': ts.strftime('%Y-%m-%dT%H:%M:%SZ'),
            'provider': 'anthropic',
            'model': model_name,
            'input_tokens': input_tokens,
            'output_tokens': output_tokens,
            'cache_read_tokens': 0,
            'cache_write_tokens': 0,
            'cost_usd': round(cost, 6),
            'latency_ms': latency,
            'status_code': 200 if random.random() > 0.02 else 429,
            'is_streaming': is_streaming,
            'app_id': app,
            'team': team,
            'feature': feature,
            'customer_tier': random.choice(customer_tiers)
        }
        events.append(event)

# Sort by timestamp
events.sort(key=lambda e: e['timestamp'])

with open('$OUTPUT', 'w') as f:
    for e in events:
        f.write(json.dumps(e) + '\n')

print(f'Generated {len(events)} events across 30 days')
print(f'Teams: {len(teams)}, Apps: {sum(len(v) for v in apps.values())}, Models: {len(models)}')
total_cost = sum(e[\"cost_usd\"] for e in events)
print(f'Total simulated spend: \${total_cost:.2f}')
"

echo "Done! Events written to $OUTPUT"
