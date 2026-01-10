const SequelizeAuto = require('sequelize-auto');

const auto = new SequelizeAuto('postgres', 'postgres', 'password', {
  host: 'host',
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
