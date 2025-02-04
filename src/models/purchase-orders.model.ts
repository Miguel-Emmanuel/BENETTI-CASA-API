import {Entity, belongsTo, hasMany, model, property, hasOne} from '@loopback/repository';
import {PurchaseOrdersStatus} from '../enums';
import {AccountPayable, AccountPayableWithRelations} from './account-payable.model';
import {AccountsReceivable} from './accounts-receivable.model';
import {Collection, CollectionWithRelations} from './collection.model';
import {Container} from './container.model';
import {DeliveryRequest} from './delivery-request.model';
import {Proforma, ProformaWithRelations} from './proforma.model';
import {Project} from './project.model';
import {Provider} from './provider.model';
import {QuotationProducts, QuotationProductsWithRelations} from './quotation-products.model';
import {Quotation} from './quotation.model';
import {Document} from './document.model';

//Ordenes de compra
@model({
  settings: {
    postgresql: {
      table: 'proforma_PurchaseOrders' // Nombre de la tabla en PostgreSQL
    },
    foreignKeys: {
    }
  }
})
export class PurchaseOrders extends Entity {
  @property({
    type: 'number',
    id: true,
    generated: true,
  })
  id?: number;

  //Fecha de creacion
  @property({
    type: 'date',
    default: () => new Date(),
  })
  createdAt: Date;

  //Fecha de término de producción (Fecha aproximada) (Se calcula cuando se completa los pagos)
  @property({
    type: 'date',
  })
  productionEndDate: Date;

  //Fecha real de término de producción (Se captura por el usuario desde la vista "Ordenes de compra")
  @property({
    type: 'date',
  })
  productionRealEndDate: Date;

  //Fecha Inicio de produccion (se calcular agregando 1 dia mas a la fecha de productionEndDate)
  @property({
    type: 'date',
  })
  productionStartDate: Date;

  //Fecha estimada de llegada(se calcula con una formula BC-46)
  @property({
    type: 'date',
  })
  arrivalDate: Date;

  //Estatus
  @property({
    type: 'string',
    required: true,
    default: PurchaseOrdersStatus.NUEVA
  })
  status: PurchaseOrdersStatus;

  @belongsTo(() => Project)
  projectId?: number;


  @hasMany(() => QuotationProducts)
  quotationProducts: QuotationProductsWithRelations[];


  //Esta pagado
  @property({
    type: 'boolean',
    default: false
  })
  isPaid: boolean;

  @belongsTo(() => Provider)
  providerId: number;

  @hasOne(() => Document)
  document: Document;
  @belongsTo(() => Quotation)
  quotationId: number;

  @belongsTo(() => Container)
  containerId: number;

  @belongsTo(() => Collection)
  collectionId?: number;

  @belongsTo(() => DeliveryRequest)
  deliveryRequestId: number;

  @belongsTo(() => AccountsReceivable)
  accountsReceivableId?: number;

  @belongsTo(() => AccountPayable)
  accountPayableId?: number;

  @belongsTo(() => Proforma)
  proformaId?: number;


  constructor(data?: Partial<PurchaseOrders>) {
    super(data);
  }
}

export interface PurchaseOrdersRelations {
  // describe navigational properties here
  proforma: ProformaWithRelations
  collection: CollectionWithRelations
  accountPayable: AccountPayableWithRelations
  project: Project
}

export type PurchaseOrdersWithRelations = PurchaseOrders & PurchaseOrdersRelations;
