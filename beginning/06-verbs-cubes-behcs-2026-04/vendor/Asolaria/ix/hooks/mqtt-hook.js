// ix-mqtt-hook.js
const mqtt = require('mqtt');
const pid = process.pid;
const client = mqtt.connect('mqtt://127.0.0.1:1883');

function emit(ixNumber, result) {
  const topic = `asolaria/ix/${ixNumber}/executed`;
  const payload = JSON.stringify({
    ix: ixNumber,
    result,
    timestamp: Date.now(),
    pid
  });
  client.publish(topic, payload, { properties: { userProperties: { pid: pid.toString() } } });
}

function subscribe(ixNumber, callback) {
  const topic = `asolaria/ix/${ixNumber}/executed`;
  client.subscribe(topic);
  client.on('message', (t, m, pkt) => {
    if (t === topic) {
      const msg = JSON.parse(m.toString());
      const senderPid =
        pkt && pkt.properties && pkt.properties.userProperties &&
        pkt.properties.userProperties.pid
          ? pkt.properties.userProperties.pid[0]
          : undefined;
      msg.pidHeader = senderPid;
      callback(msg);
    }
  });
}

module.exports = { emit, subscribe };
