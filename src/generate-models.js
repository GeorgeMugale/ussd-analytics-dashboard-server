const SequelizeAuto = require('sequelize-auto');

const auto = new SequelizeAuto('postgres', 'postgres', '6SW3Q6nm$3WMQUKImjgV>4?KzjR:', {
  host: 'ussd-analytics.c5ocsgaoeod9.eu-north-1.rds.amazonaws.com',
  dialect: 'postgres',
  port: 5432,
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false, // allows connection to RDS without certificate verification
    },
  },
  directory: './src/models', // where to write models
  caseModel: 'p', // PascalCase model names
  caseFile: 'c',  // camelCase file names
  lang: 'ts',     // generate TypeScript
});

auto.run().then(() => {
  console.log('Models generated successfully!');
}).catch(err => {
  console.error(err);
});
