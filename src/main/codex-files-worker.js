const {parentPort,workerData}=require('node:worker_threads'),path=require('node:path'),{performance}=require('node:perf_hooks');
const {readActivity}=require('./activity.js'),{readQuota}=require('./quota-source.js');
parentPort.on('message',({id})=>{const started=performance.now(),activity=readActivity({root:workerData.root}),quota=readQuota(workerData.root?path.join(workerData.root,'sessions'):undefined);parentPort.postMessage({id,activity,quota,stats:{milliseconds:Math.round(performance.now()-started),heapMb:Math.round(process.memoryUsage().heapUsed/1048576)}});});
