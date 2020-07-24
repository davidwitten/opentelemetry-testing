const opentelemetry = require('@opentelemetry/api');
const { NodeTracerProvider } = require('@opentelemetry/node');
const { SimpleSpanProcessor } = require('@opentelemetry/tracing');
const { TraceExporter } = require('@google-cloud/opentelemetry-cloud-trace-exporter');
const { globalStats, MeasureUnit, AggregationType } = require('@opencensus/core');
const { StackdriverStatsExporter } = require('@opencensus/exporter-stackdriver');
const { ConsoleLogger } = require('@opentelemetry/core');
const { MeterProvider, MetricObservable } = require('@opentelemetry/metrics');
const { MetricExporter } = require('@google-cloud/opentelemetry-cloud-monitoring-exporter');
const { CollectorTraceExporter, CollectorMetricExporter} = require('@opentelemetry/exporter-collector');
// import { CollectorMetricExporter } from '@opentelemetry/exporter-collector';
const express = require('express');
const app = express();
const cors = require('cors');
const fs = require('fs');
const grpc = require('grpc'); // require('./node_modules/@opentelemetry/exporter-collector/node_modules/grpc');
//remove for production
app.use(cors());
app.options('*', cors());

require('dotenv').config({path:"../Client/.env"})

const projectId = process.env.REACT_APP_GOOGLE_PROJECT_ID;
const metricURL = `${process.env.REACT_APP_OT_COLLECTOR}`;///v1/metrics`;
const collectorURL = `${process.env.REACT_APP_OT_COLLECTOR}`;///v1/trace`;

// GOOGLE_APPLICATION_CREDENTIALS are expected by a dependency of this code
// and not this code itself. Checking for existence here but not retaining (as not needed)
console.log(projectId)
if (!projectId) {
    throw Error('Unable to proceed without a Project ID');
}

const provider = new NodeTracerProvider();

const credentials = grpc.credentials.createSsl(
    fs.readFileSync('./ca.crt'),
    fs.readFileSync('./client.key'),
    fs.readFileSync('./client.crt')
  );

// Initialize the exporter
const te = new CollectorTraceExporter({ serviceName: 'basic_service', url: collectorURL, projectId: projectId});

// Configure the span processor to send spans to the exporter
provider.addSpanProcessor(new SimpleSpanProcessor(te));
provider.register();
opentelemetry.trace.setGlobalTracerProvider(provider);
const tracer = opentelemetry.trace.getTracer('basic');

const me = new CollectorMetricExporter({url: metricURL, logger: new ConsoleLogger()});

// Register the exporter
const meter = new MeterProvider({
    exporter: me,
    interval: 6000,
}).getMeter('example-prometheus');


// creating metrics
const request_count = meter.createCounter('CountingRequests', {
    monotonic: true,
    labelKeys: ['pid'],
    description: 'Counts number of requests',
});

const error_count = meter.createCounter('ErrorCount', {
    monotonic: true,
    labelKeys: ['pid'],
    description: 'Counts the number of errors',
});

const latencyObserver = meter.createValueObserver('ObserveLatency', {
    monotonic: false,
    labelKeys: ['pid'],
    description: 'Example of a observer',
}, (observerResult) => {
    observerResult.observe(returnLatency(), { pid: process.pid.toString() });
});

let latency = 100;
function returnLatency() {
    return latency;
}

const db = {
    "yeast": ["vendorA", "vendorB"],
    "flour": ["vendorC", "vendorD"],
    "butter": ["vendorB"],
    "egg": ["vendorA", "vendorB", "vendorC", "vendorD"],
    "milk": ["vendorA", "vendorC", "vendorD"],
    "sugar": ["vendorB", "vendorD"]
};

const labels = { pid: process.pid.toString() };

app.get('/', (req, res) => {
    request_count.bind(labels).add(1);
    error_count.bind(labels).add(3000);
    
    // setting up span for tracer
    const span = tracer.startSpan('query latency');
    // Set attributes to the span.
    span.setAttribute('key', 'value');
    // Annotate our span to capture metadata about our operation
    span.addEvent('invoking work');

    let artificialLatency = Math.floor(Math.random() * 5) + 1; // 1, ... , 5 inclusive
    artificialLatency *= 100; // 0.5 seconds to 2.5 seconds
    setTimeout(function () {
        res.send(db[req.query.ingredient]);
        span.end();
        latency = artificialLatency;
    }, artificialLatency);

});


app.listen(8000, () => {
    console.log('Supplier app listening on port 8000!');
});
