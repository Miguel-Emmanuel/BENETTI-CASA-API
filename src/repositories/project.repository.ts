import {Getter, inject} from '@loopback/core';
import {BelongsToAccessor, repository, HasManyRepositoryFactory, HasOneRepositoryFactory} from '@loopback/repository';
import {DbDataSource} from '../datasources';
import {LogModelName} from '../enums';
import {OperationHookBindings} from '../keys';
import {Project, ProjectRelations, Quotation, AdvancePaymentRecord, CommissionPaymentRecord, Branch, Customer, Document, Proforma, AccountsReceivable, DeliveryRequest} from '../models';
import {OperationHook} from '../operation-hooks';
import {QuotationRepository} from './quotation.repository';
import {SoftCrudRepository} from './soft-delete-entity.repository.base';
import {AdvancePaymentRecordRepository} from './advance-payment-record.repository';
import {CommissionPaymentRecordRepository} from './commission-payment-record.repository';
import {BranchRepository} from './branch.repository';
import {CustomerRepository} from './customer.repository';
import {DocumentRepository} from './document.repository';
import {ProformaRepository} from './proforma.repository';
import {AccountsReceivableRepository} from './accounts-receivable.repository';
import {DeliveryRequestRepository} from './delivery-request.repository';

export class ProjectRepository extends SoftCrudRepository<
  Project,
  typeof Project.prototype.id,
  ProjectRelations
> {

  public readonly quotation: BelongsToAccessor<Quotation, typeof Project.prototype.id>;

  public readonly advancePaymentRecords: HasManyRepositoryFactory<AdvancePaymentRecord, typeof Project.prototype.id>;

  public readonly commissionPaymentRecords: HasManyRepositoryFactory<CommissionPaymentRecord, typeof Project.prototype.id>;

  public readonly branch: BelongsToAccessor<Branch, typeof Project.prototype.id>;

  public readonly customer: BelongsToAccessor<Customer, typeof Project.prototype.id>;

  public readonly clientQuoteFile: HasOneRepositoryFactory<Document, typeof Project.prototype.id>;

  public readonly providerFile: HasOneRepositoryFactory<Document, typeof Project.prototype.id>;

  public readonly advanceFile: HasManyRepositoryFactory<Document, typeof Project.prototype.id>;

  public readonly documents: HasManyRepositoryFactory<Document, typeof Project.prototype.id>;

  public readonly proformas: HasManyRepositoryFactory<Proforma, typeof Project.prototype.id>;

  public readonly accountsReceivables: HasManyRepositoryFactory<AccountsReceivable, typeof Project.prototype.id>;

  public readonly deliveryRequests: HasManyRepositoryFactory<DeliveryRequest, typeof Project.prototype.id>;

  constructor(
    @inject('datasources.db') dataSource: DbDataSource,
    @inject.getter(OperationHookBindings.OPERATION_SERVICE)
    public operationHook: Getter<OperationHook>,
    @repository.getter('QuotationRepository') protected quotationRepositoryGetter: Getter<QuotationRepository>, @repository.getter('AdvancePaymentRecordRepository') protected advancePaymentRecordRepositoryGetter: Getter<AdvancePaymentRecordRepository>, @repository.getter('CommissionPaymentRecordRepository') protected commissionPaymentRecordRepositoryGetter: Getter<CommissionPaymentRecordRepository>, @repository.getter('BranchRepository') protected branchRepositoryGetter: Getter<BranchRepository>, @repository.getter('CustomerRepository') protected customerRepositoryGetter: Getter<CustomerRepository>, @repository.getter('DocumentRepository') protected documentRepositoryGetter: Getter<DocumentRepository>, @repository.getter('ProformaRepository') protected proformaRepositoryGetter: Getter<ProformaRepository>, @repository.getter('AccountsReceivableRepository') protected accountsReceivableRepositoryGetter: Getter<AccountsReceivableRepository>, @repository.getter('DeliveryRequestRepository') protected deliveryRequestRepositoryGetter: Getter<DeliveryRequestRepository>,
  ) {
    super(Project, dataSource);
    this.deliveryRequests = this.createHasManyRepositoryFactoryFor('deliveryRequests', deliveryRequestRepositoryGetter,);
    this.registerInclusionResolver('deliveryRequests', this.deliveryRequests.inclusionResolver);
    this.accountsReceivables = this.createHasManyRepositoryFactoryFor('accountsReceivables', accountsReceivableRepositoryGetter,);
    this.registerInclusionResolver('accountsReceivables', this.accountsReceivables.inclusionResolver);
    this.proformas = this.createHasManyRepositoryFactoryFor('proformas', proformaRepositoryGetter,);
    this.registerInclusionResolver('proformas', this.proformas.inclusionResolver);
    this.documents = this.createHasManyRepositoryFactoryFor('documents', documentRepositoryGetter,);
    this.registerInclusionResolver('documents', this.documents.inclusionResolver);
    this.advanceFile = this.createHasManyRepositoryFactoryFor('advanceFile', documentRepositoryGetter,);
    this.registerInclusionResolver('advanceFile', this.advanceFile.inclusionResolver);
    this.providerFile = this.createHasOneRepositoryFactoryFor('providerFile', documentRepositoryGetter);
    this.registerInclusionResolver('providerFile', this.providerFile.inclusionResolver);
    this.clientQuoteFile = this.createHasOneRepositoryFactoryFor('clientQuoteFile', documentRepositoryGetter);
    this.registerInclusionResolver('clientQuoteFile', this.clientQuoteFile.inclusionResolver);
    this.customer = this.createBelongsToAccessorFor('customer', customerRepositoryGetter,);
    this.registerInclusionResolver('customer', this.customer.inclusionResolver);
    this.branch = this.createBelongsToAccessorFor('branch', branchRepositoryGetter,);
    this.registerInclusionResolver('branch', this.branch.inclusionResolver);
    this.commissionPaymentRecords = this.createHasManyRepositoryFactoryFor('commissionPaymentRecords', commissionPaymentRecordRepositoryGetter,);
    this.registerInclusionResolver('commissionPaymentRecords', this.commissionPaymentRecords.inclusionResolver);
    this.advancePaymentRecords = this.createHasManyRepositoryFactoryFor('advancePaymentRecords', advancePaymentRecordRepositoryGetter,);
    this.registerInclusionResolver('advancePaymentRecords', this.advancePaymentRecords.inclusionResolver);
    this.quotation = this.createBelongsToAccessorFor('quotation', quotationRepositoryGetter,);
    this.registerInclusionResolver('quotation', this.quotation.inclusionResolver);
    this.definePersistedModel(Project)
    this.modelClass.observe('before save', async (ctx: any) => {
      const hook = await this.operationHook();
      await hook.beforeSave(this, ctx, LogModelName.PROJECT);
    });
  }
}
