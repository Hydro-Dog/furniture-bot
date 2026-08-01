import '../../env';
import { createMigrator, createSequelizeInstance, waitForDatabase } from '../migrator';

async function undoLastMigration(): Promise<void> {
  const sequelize = createSequelizeInstance();

  try {
    await waitForDatabase(sequelize);
    const migrator = createMigrator(sequelize);
    const reverted = await migrator.down({ step: 1 });

    if (reverted.length === 0) {
      console.log('No migration to undo');
      return;
    }

    console.log('Reverted migration:', reverted[0].name);
  } finally {
    await sequelize.close();
  }
}

undoLastMigration().catch((error: unknown) => {
  console.error('Undo migration failed', error);
  process.exit(1);
});
