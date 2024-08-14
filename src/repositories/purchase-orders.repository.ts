import {Getter, inject} from '@loopback/core';
import {BelongsToAccessor, DefaultCrudRepository, repository} from '@loopback/repository';
import {DbDataSource} from '../datasources';
import {OperationHookBindings} from '../keys';
import {AccountPayable, AccountsReceivable, Collection, DeliveryRequest, Proforma, PurchaseOrders, PurchaseOrdersRelations, Project} from '../models';
import {PurchaseOrderHook} from '../operation-hooks/purchase-order.hook';
import {AccountPayableRepository} from './account-payable.repository';
import {AccountsReceivableRepository} from './accounts-receivable.repository';
import {CollectionRepository} from './collection.repository';
import {DeliveryRequestRepository} from './delivery-request.repository';
import {ProformaRepository} from './proforma.repository';
import {ProviderRepository} from './provider.repository';
import {ProjectRepository} from './project.repository';

export class PurchaseOrdersRepository extends DefaultCrudRepository<
  PurchaseOrders,
  typeof PurchaseOrders.prototype.id,
  PurchaseOrdersRelations
> {

  public readonly accountPayable: BelongsToAccessor<AccountPayable, typeof PurchaseOrders.prototype.id>;

  public readonly proforma: BelongsToAccessor<Proforma, typeof PurchaseOrders.prototype.id>;

  public readonly accountsReceivable: BelongsToAccessor<AccountsReceivable, typeof PurchaseOrders.prototype.id>;

  public readonly deliveryRequest: BelongsToAccessor<DeliveryRequest, typeof PurchaseOrders.prototype.id>;

  public readonly collection: BelongsToAccessor<Collection, typeof PurchaseOrders.prototype.id>;

  public readonly project: BelongsToAccessor<Project, typeof PurchaseOrders.prototype.id>;

  constructor(
    @inject('datasources.db') dataSource: DbDataSource, @repository.getter('ProviderRepository') protected providerRepositoryGetter: Getter<ProviderRepository>, @repository.getter('AccountPayableRepository') protected accountPayableRepositoryGetter: Getter<AccountPayableRepository>, @repository.getter('ProformaRepository') protected proformaRepositoryGetter: Getter<ProformaRepository>, @repository.getter('AccountsReceivableRepository') protected accountsReceivableRepositoryGetter: Getter<AccountsReceivableRepository>, @repository.getter('DeliveryRequestRepository') protected deliveryRequestRepositoryGetter: Getter<DeliveryRequestRepository>, @repository.getter('CollectionRepository') protected collectionRepositoryGetter: Getter<CollectionRepository>,
    @inject.getter(OperationHookBindings.OPERATION_SERVICE_PURCHASE)
    public operationHook: Getter<PurchaseOrderHook>, @repository.getter('ProjectRepository') protected projectRepositoryGetter: Getter<ProjectRepository>,
  ) {
    super(PurchaseOrders, dataSource);
    this.project = this.createBelongsToAccessorFor('project', projectRepositoryGetter,);
    this.registerInclusionResolver('project', this.project.inclusionResolver);
    this.collection = this.createBelongsToAccessorFor('collection', collectionRepositoryGetter,);
    this.registerInclusionResolver('collection', this.collection.inclusionResolver);
    this.deliveryRequest = this.createBelongsToAccessorFor('deliveryRequest', deliveryRequestRepositoryGetter,);
    this.registerInclusionResolver('deliveryRequest', this.deliveryRequest.inclusionResolver);
    this.accountsReceivable = this.createBelongsToAccessorFor('accountsReceivable', accountsReceivableRepositoryGetter,);
    this.registerInclusionResolver('accountsReceivable', this.accountsReceivable.inclusionResolver);
    this.proforma = this.createBelongsToAccessorFor('proforma', proformaRepositoryGetter,);
    this.registerInclusionResolver('proforma', this.proforma.inclusionResolver);
    this.accountPayable = this.createBelongsToAccessorFor('accountPayable', accountPayableRepositoryGetter,);
    this.registerInclusionResolver('accountPayable', this.accountPayable.inclusionResolver);

    this.definePersistedModel(PurchaseOrders)
    this.modelClass.observe('after save', async (ctx: any) => {
      const hook = await this.operationHook();
      await hook.afterSave(this, ctx);
    });
  }
}
