import {modulesSeed} from './modules';
import {roleSeeds} from './roles';

export const roleModuleSeeds = [
  // Dar todos los permisos al rol Administrador para todos los módulos
  ...modulesSeed.map(module => ({
    roleName: roleSeeds[0].name, // 'Adminstrador'
    moduleName: module.name,
    create: true,
    read: true,
    update: true,
    del: true
  }))
];
