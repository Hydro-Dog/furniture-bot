import '../../env';
import { seedAuthDefaults } from '../../auth/utils/bootstrap-admin';
import { createMigrator, createSequelizeInstance, waitForDatabase } from '../migrator';

async function runMigrations(): Promise<void> {
  const sequelize = createSequelizeInstance();

  try {
    await waitForDatabase(sequelize);
    const migrator = createMigrator(sequelize);
    const executed = await migrator.up();

    if (executed.length === 0) {
      console.log('No pending migrations');
    } else {
      console.log('Executed migrations:', executed.map((item) => item.name));
    }

    await seedAuthDefaults(sequelize);
    console.log('Auth defaults ensured');
  } finally {
    await sequelize.close();
  }
}

runMigrations().catch((error: unknown) => {
  console.error('Migration failed', error);
  process.exit(1);
});
