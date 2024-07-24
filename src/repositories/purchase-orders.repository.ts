import {Getter, inject} from '@loopback/core';
import {BelongsToAccessor, DefaultCrudRepository, repository} from '@loopback/repository';
import {DbDataSource} from '../datasources';
import {AccountPayable, Proforma, PurchaseOrders, PurchaseOrdersRelations, AccountsReceivable} from '../models';
import {AccountPayableRepository} from './account-payable.repository';
import {ProformaRepository} from './proforma.repository';
import {ProviderRepository} from './provider.repository';
import {AccountsReceivableRepository} from './accounts-receivable.repository';

export class PurchaseOrdersRepository extends DefaultCrudRepository<
  PurchaseOrders,
  typeof PurchaseOrders.prototype.id,
  PurchaseOrdersRelations
> {

  public readonly accountPayable: BelongsToAccessor<AccountPayable, typeof PurchaseOrders.prototype.id>;

  public readonly proforma: BelongsToAccessor<Proforma, typeof PurchaseOrders.prototype.id>;

  public readonly accountsReceivable: BelongsToAccessor<AccountsReceivable, typeof PurchaseOrders.prototype.id>;

  constructor(
    @inject('datasources.db') dataSource: DbDataSource, @repository.getter('ProviderRepository') protected providerRepositoryGetter: Getter<ProviderRepository>, @repository.getter('AccountPayableRepository') protected accountPayableRepositoryGetter: Getter<AccountPayableRepository>, @repository.getter('ProformaRepository') protected proformaRepositoryGetter: Getter<ProformaRepository>, @repository.getter('AccountsReceivableRepository') protected accountsReceivableRepositoryGetter: Getter<AccountsReceivableRepository>,
  ) {
    super(PurchaseOrders, dataSource);
    this.accountsReceivable = this.createBelongsToAccessorFor('accountsReceivable', accountsReceivableRepositoryGetter,);
    this.registerInclusionResolver('accountsReceivable', this.accountsReceivable.inclusionResolver);
    this.proforma = this.createBelongsToAccessorFor('proforma', proformaRepositoryGetter,);
    this.registerInclusionResolver('proforma', this.proforma.inclusionResolver);
    this.accountPayable = this.createBelongsToAccessorFor('accountPayable', accountPayableRepositoryGetter,);
    this.registerInclusionResolver('accountPayable', this.accountPayable.inclusionResolver);
  }
}
