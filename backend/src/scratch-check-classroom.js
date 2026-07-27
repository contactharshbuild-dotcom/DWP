import { sequelize, User, Classroom } from './models/index.js';

async function check() {
  try {
    const id = 1;
    const organizationId = 1;

    const classroom = await Classroom.findOne({
      where: {
        id,
        organization_id: organizationId
      },
      include: [{
        model: User,
        as: 'teachers',
        attributes: ['id', 'name', 'email', 'status', 'batch'],
        through: { attributes: ['status', 'role'] }
      }]
    });

    console.log('--- CLASSROOM QUERY RESULT ---');
    console.log(classroom ? classroom.toJSON() : 'null');
  } catch (error) {
    console.error('--- ERROR ---');
    console.error(error);
  } finally {
    await sequelize.close();
  }
}

check();
