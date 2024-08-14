import {UserCredentialsWithRelations} from '@loopback/authentication-jwt';
import {belongsTo, hasMany, hasOne, model, property} from '@loopback/repository';
import {TypeUserE} from '../enums';
import {BaseEntity} from './base/base-entity.model';
import {Branch} from './branch.model';
import {Organization} from './organization.model';
import {QuotationDesigner, QuotationDesignerWithRelations} from './quotation-designer.model';
import {QuotationProjectManager, QuotationProjectManagerWithRelations} from './quotation-project-manager.model';
import {Quotation} from './quotation.model';
import {Role, RoleWithRelations} from './role.model';
import {UserCredentials} from './user-credentials.model';
import {UserData, UserDataWithRelations} from './user-data.model';

@model({
  settings: {
    postgresql: {
      table: 'user_User' // Nombre de la tabla en PostgreSQL
    },
    foreignKeys: {
      fk_role_roleId: {
        name: 'fk_role_roleId',
        entity: 'Role',
        entityKey: 'id',
        foreignKey: 'roleid',
      },
      fk_organization_organizationId: {
        name: 'fk_organization_organizationId',
        entity: 'Organization',
        entityKey: 'id',
        foreignKey: 'organizationid',
      },
      fk_userData_userDataId: {
        name: 'fk_userData_userDataId',
        entity: 'UserData',
        entityKey: 'id',
        foreignKey: 'userdataid',
      },
    }
  }
})

export class User extends BaseEntity {

  @property({
    type: 'number',
    id: true,
    generated: true,
  })
  id?: number;

  @property({
    type: 'string',
    jsonSchema: {
      format: 'email'
    },
  })
  email: string;

  @property({
    type: 'string',
  })
  username?: string;

  @property({
    type: 'string',
  })
  firstName: string;

  @property({
    type: 'string',
  })
  lastName?: string;

  @property({
    type: 'string',
  })
  avatar?: string;

  @property({
    type: 'boolean',
    default: true,
  })
  isFirstTimeLogin: boolean;

  @property({
    type: 'boolean',
    default: false,
  })
  isSuperAdmin?: boolean;

  @property({
    type: 'boolean',
    default: false,
  })
  isAdmin?: boolean;

  @property({
    type: 'boolean',
    default: false,
  })
  isActive?: boolean;

  @property({
    type: 'string',
  })
  activateDeactivateComment?: string;

  @property({
    type: 'string',
  })
  resetPasswordToken?: string;

  @property({
    type: 'date',
  })
  tokenExpiration?: Date;

  @hasOne(() => UserCredentials)
  userCredentials: UserCredentials;

  @belongsTo(() => Role)
  roleId?: number;

  @belongsTo(() => Organization)
  organizationId: number;

  @belongsTo(() => UserData)
  userDataId: number;

  @property({
    type: 'boolean',
    default: false,
  })
  isMaster?: boolean;

  @property({
    type: 'string',
  })
  typeUser?: TypeUserE;

  @belongsTo(() => User)
  immediateBossId: number;

  @belongsTo(() => Branch)
  branchId: number;

  @hasMany(() => Quotation, {through: {model: () => QuotationProjectManager}})
  quotationProjectManager: Quotation[];

  @hasMany(() => Quotation, {through: {model: () => QuotationDesigner}})
  quotationDesigner: Quotation[];

  @hasOne(() => QuotationProjectManager)
  quotationPM: QuotationProjectManager;

  @hasOne(() => QuotationDesigner)
  quotationDe: QuotationDesigner;

  //Es project manager
  @property({
    type: 'boolean',
    default: false,
  })
  isProjectManager?: boolean;

  //Es showroom manager
  @property({
    type: 'boolean',
    default: false,
  })
  isShowroomManager?: boolean;

  //Es proyectista
  @property({
    type: 'boolean',
    default: false,
  })
  isDesigner?: boolean;

  //Es logistica
  @property({
    type: 'boolean',
    default: false,
  })
  isLogistics?: boolean;

  //Responsable de Órdenes de compra
  @property({
    type: 'boolean',
    default: false,
  })
  isPurchaseOrderManager?: boolean;

  // @hasOne(() => QuotationProjectManager)
  // quotationProjectManager: QuotationProjectManager;

  // @hasOne(() => QuotationDesigner)
  // quotationDesigner: QuotationDesigner;

  constructor(
    data?: Partial<User>
  ) {
    super(data);
  }
}

export interface UserRelations {
  userData: UserDataWithRelations
  userCredentials: UserCredentialsWithRelations
  role: RoleWithRelations
  quotationPM: QuotationProjectManagerWithRelations
  quotationDe: QuotationDesignerWithRelations
  // describe navigational properties here
}

export type UserWithRelations = User & UserRelations;
