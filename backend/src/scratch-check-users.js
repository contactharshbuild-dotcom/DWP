import { sequelize, User, Organization, Classroom } from './models/index.js';

async function check() {
  try {
    const users = await User.findAll({
      attributes: ['id', 'name', 'email', 'role', 'status', 'organization_id'],
      raw: true
    });
    console.log('--- USERS ---');
    console.log(users);

    const orgs = await Organization.findAll({
      raw: true
    });
    console.log('--- ORGANIZATIONS ---');
    console.log(orgs);

    const classrooms = await Classroom.findAll({
      raw: true
    });
    console.log('--- CLASSROOMS ---');
    console.log(classrooms);
  } catch (error) {
    console.error(error);
  } finally {
    await sequelize.close();
  }
}

check();
