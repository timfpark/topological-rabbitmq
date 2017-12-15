const async = require('async'),
      amqp = require('amqplib/callback_api'),
      { Connection } = require("topological");

class RabbitMQConnection extends Connection {
    constructor(config) {
        super(config);

        console.dir(this.config);

        this.config.maxMessagesOutstanding = this.config.maxMessagesOutstanding || 5;
        this.supportsStreaming = true;
    }

    start(startCallback) {
        amqp.connect(this.config.rabbitmqEndpoint, (err, conn) => {
            if (err) return startCallback(err);

            conn.createChannel((err, ch) => {
                if (err) return startCallback(err);

                this.channel = ch;
                this.channel.assertQueue(this.config.queueName, { durable: true });
                this.channel.prefetch(this.config.maxMessagesOutstanding);

                return startCallback();
            });
        });
    }

    complete(message, completeCallback) {
        this.channel.ack(message);
        if (completeCallback) return completeCallback();
    }

    enqueue(messages, enqueueCallback) {
        console.log(`${this.id}: enqueuing ${JSON.stringify(messages)}`);

        async.each(messages, (message, messageCallback) => {
            let messageBuffer = new Buffer(
                JSON.stringify(message.body)
            );

            this.channel.sendToQueue(this.config.queueName, messageBuffer, { persistant: true });
            return messageCallback();
        }, enqueueCallback);
    }

    dequeueImpl(dequeueCallback) {
        this.channel.consume(this.config.queueName, message => {
            message.body = JSON.parse(message.content.toString());
            console.log(`${this.id}: dequeued ${JSON.stringify(message.body)}`);
            return dequeueCallback(null, message);
        });
    }

    dequeue(dequeueCallback) {
        let message = false;
        async.whilst(
            () => { return !message; },
            iterationCallback => {
                this.dequeueImpl( (err, receivedMessage) => {
                    message = receivedMessage;
                    return iterationCallback();
                });
            }, err => {
                return dequeueCallback(err, message);
            }
        );
    }

    stream(streamCallback) {
        this.channel.consume(this.config.queueName, message => {
            message.body = JSON.parse(message.content.toString());
            console.log(`${this.id}: dequeued ${JSON.stringify(message.body)}`);
            return streamCallback(null, message);
        });
    }
}

module.exports = RabbitMQConnection;
