import {Application, CoreBindings, inject, LifeCycleObserver, lifeCycleObserver} from '@loopback/core';
import {repository} from '@loopback/repository';
import _ from 'lodash';

import dayjs from 'dayjs';
import {PasswordHasherBindings} from '../keys';
import {User, UserData} from '../models';
import {
  ModuleRepository,
  OrganizationRepository,
  RoleRepository,
  UserCredentialsRepository, UserDataRepository, UserRepository
} from '../repositories';
import {organizationSeeds, roleSeeds, userSeeds} from '../seed-data';
import {modulesSeed} from '../seed-data/modules';
import {BcryptHasher} from '../services/bcrypt.service';

/**
 * This class will be bound to the application as a `LifeCycleObserver` during
 * `boot`
 */
@lifeCycleObserver('')
export class TheSystemObserver implements LifeCycleObserver {
  constructor(
    @inject(CoreBindings.APPLICATION_INSTANCE) private app: Application,
    @repository(OrganizationRepository)
    public organizationRepository: OrganizationRepository,
    @repository(RoleRepository)
    public roleRepository: RoleRepository,
    @repository(ModuleRepository)
    public moduleRepository: ModuleRepository,
    @repository(UserRepository)
    public userRepository: UserRepository,
    @repository(UserCredentialsRepository)
    public userCredentialsRepository: UserCredentialsRepository,
    @repository(UserDataRepository)
    public userDataRepository: UserDataRepository,
    @inject(PasswordHasherBindings.PASSWORD_HASHER) public hasher: BcryptHasher
  ) { }

  /**
   * This method will be invoked when the application starts.
   */
  async start(): Promise<void> {
    // Add your logic for start
    console.log('START INITIAL CREATOR');
    
    //const deleteAllRes: any = await this.resetAll();
    //console.log(deleteAllRes.message);
    const organizationsRes: any = await this.createOrganizations();
    console.log(organizationsRes.message);
    console.log('ORGANIZATIONS CREATED')
    const modules = await this.createModules();
    const sysUserRoleRes: any = await this.createRoles();
    console.log(sysUserRoleRes.message);
    const sysUserRes: any = await this.createSysUsers();
    console.log(sysUserRes.message);
  }

  async resetAll(): Promise<Object> {
    await this.organizationRepository.deleteAll();
    await this.roleRepository.deleteAll();
    await this.userCredentialsRepository.deleteAll();
    await this.userRepository.deleteAll();
    await this.userDataRepository.deleteAll();
    return {
      message: `ALL DELETED`,
    };
  }

  async createOrganizations(): Promise<Object> {
    const orgCount = await this.organizationRepository.count();
    if (orgCount.count === 0) {
      for (let index = 0; index < organizationSeeds.length; index++) {
        const element = organizationSeeds[index];
        await this.organizationRepository.create(element);
      }
      return {message: 'Organizations Created'};
    } else {
      return {
        message: `There are Organizations in the DB`,
      };
    }
  }

  async createModules(): Promise<Object> {
    const currentModules = await this.moduleRepository.find();
    let modulesLabel = '';
    for (let index = 0; index < modulesSeed.length; index++) {
      const element = modulesSeed[index];

      if (currentModules.length == 0 || !currentModules.find(c => c.name == element.name)) {
        this.moduleRepository.create(element);
        modulesLabel += `${element.name}, `;
      }
    }

    return {
      message: modulesLabel ? `Modules Created: ${modulesLabel}` : `There are Modules in the DB`,
    }
  }

  async createRoles(): Promise<Object> {
    const rolesCount = await this.roleRepository.count();
    if (rolesCount.count === 0) {
      for (let index = 0; index < roleSeeds.length; index++) {
        const element = roleSeeds[index];
        const myOrganization = await this.organizationRepository.find({
          where: {name: element.organization},
        });
        if (myOrganization.length > 0) {
          let createSysRole: any;
          createSysRole = {..._.omit(element, 'organization')};
          createSysRole.organizationId = myOrganization[0].id;
          await this.roleRepository.create(createSysRole);
        } else {
          console.log(`Organization not found: ${element.organization}`);
        }
      }
      return {message: 'SysUserRoles Created'};
    } else {
      let sysUserRoleLabel = '';
      const roleFind = await this.roleRepository.find({limit: 2});
      for (const role of roleFind) {
        sysUserRoleLabel += `${role.name}, `;
      }
      return {
        message: `There are SysUserRoles in the DB ${sysUserRoleLabel}`,
      };
    }
  }

  async createSysUsers(): Promise<Object> {
    const usersCount = await this.userRepository.count();
    const sysUsersCount = await this.userDataRepository.count();
    if (usersCount.count === 0 && sysUsersCount.count === 0) {
      for (let index = 0; index < userSeeds.length; index++) {
        const element = userSeeds[index];

        const myOrganization = await this.organizationRepository.find({
          where: {name: element.user.organization},
        });
        const userRole = await this.roleRepository.find({
          where: {name: element.userData.role},
        });
        if (myOrganization.length > 0 && userRole.length > 0) {
          let userToSignup = {
            user: {
              ..._.omit(element.user, 'organization'),
              organizationId: myOrganization[0].id,
              roleId: userRole[0].id,
            },
            userData: {
              ..._.omit(element.userData, 'role'),
            },
          };
          console.log('userToSignup', userToSignup);

          const {password, ...userToSave} = userToSignup.user;

          const user = new User(userToSave);
          const sysUserData = new UserData(userToSignup.userData);



          const {username, email} = userToSignup.user;

          const emailValidator = await this.userRepository.findOne({
            where: {email: email},
          });
          const usernameValidator = await this.userRepository.findOne({
            where: {username: username},
          });

          user.tokenExpiration = dayjs().add(24, 'hours').toDate();
          const hashpassword = await this.hasher.hashPassword(userToSignup.user.password);

          if (usernameValidator === null && emailValidator === null) {
            console.log('CREATE USER');
            const userCreated = await this.userRepository.create(user);
            await this.userRepository
              .userCredentials(userCreated.id)
              .create({password: hashpassword});
            console.log('userCreated', userCreated);
          } else if (emailValidator !== null) {
            console.log('UPDATE USER WITH EMAIL', emailValidator);
            await this.userRepository.updateById(emailValidator.id, user);
            await this.userRepository
              .userCredentials(emailValidator.id)
              .patch({password});
          } else if (usernameValidator !== null) {
            console.log('UPDATE USER WITH USERNAME', usernameValidator);
            await this.userRepository.updateById(usernameValidator.id, user);
            await this.userRepository
              .userCredentials(usernameValidator.id)
              .patch({password});
          }
          const savedUser = await this.userRepository.findOne({
            where: {email: email},
          });
          if (savedUser !== null) {


            if (savedUser.id) {
              sysUserData.userId = savedUser.id;
            }
            const sysUserDataSaver = await this.userDataRepository.create(
              sysUserData
            );
            console.log('sysUserDataSaver', sysUserDataSaver);
            if (sysUserDataSaver) {
              await this.userRepository.updateById(savedUser.id, {
                userDataId: sysUserDataSaver.id,
              });
            }
          } else {
            console.log(`SavedUser is null`);
          }
        } else {
          console.log('Organization or Role not found');
        }
      }
      return {message: 'Users Created'};
    } else {
      let sysUserLabel = '';
      const userFind = await this.userRepository.find({limit: 1});
      for (const user of userFind) {
        sysUserLabel += `${user.firstName} ${user.lastName}, `;
      }
      return {message: `There are Users in the DB: ${sysUserLabel}`};
    }
  }
}
