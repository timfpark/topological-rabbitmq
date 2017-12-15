const RabbitMQConnection = require('../index');

module.exports = {
     connection: new RabbitMQConnection({
          name: "rabbitMQConnection",
          config: {
              queueName: 'test',
              rabbitmqEndpoint: 'amqp://localhost'
          }
     })
};
