import {Getter, inject} from '@loopback/core';
import {BelongsToAccessor, HasManyThroughRepositoryFactory, HasOneRepositoryFactory, repository} from '@loopback/repository';
import {DbDataSource} from '../datasources';
import {LogModelName} from '../enums';
import {OperationHookBindings} from '../keys';
import {Brand, Classification, Line, Organization, Product, ProductRelations, Provider, Quotation, QuotationProducts, Document} from '../models';
import {OperationHook} from '../operation-hooks';
import {BrandRepository} from './brand.repository';
import {ClassificationRepository} from './classification.repository';
import {LineRepository} from './line.repository';
import {OrganizationRepository} from './organization.repository';
import {ProviderRepository} from './provider.repository';
import {QuotationProductsRepository} from './quotation-products.repository';
import {QuotationRepository} from './quotation.repository';
import {SoftCrudRepository} from './soft-delete-entity.repository.base';
import {DocumentRepository} from './document.repository';

export class ProductRepository extends SoftCrudRepository<
  Product,
  typeof Product.prototype.id,
  ProductRelations
> {

  public readonly organization: BelongsToAccessor<Organization, typeof Product.prototype.id>;


  public readonly provider: BelongsToAccessor<Provider, typeof Product.prototype.id>;

  public readonly brand: BelongsToAccessor<Brand, typeof Product.prototype.id>;

  public readonly quotations: HasManyThroughRepositoryFactory<Quotation, typeof Quotation.prototype.id,
    QuotationProducts,
    typeof Product.prototype.id
  >;

  public readonly quotationProducts: HasOneRepositoryFactory<QuotationProducts, typeof Product.prototype.id>;

  public readonly classification: BelongsToAccessor<Classification, typeof Product.prototype.id>;

  public readonly line: BelongsToAccessor<Line, typeof Product.prototype.id>;

  public readonly document: HasOneRepositoryFactory<Document, typeof Product.prototype.id>;

  constructor(
    @inject('datasources.db') dataSource: DbDataSource,
    @inject.getter(OperationHookBindings.OPERATION_SERVICE)
    public operationHook: Getter<OperationHook>,
    @repository.getter('OrganizationRepository') protected organizationRepositoryGetter: Getter<OrganizationRepository>, @repository.getter('ProviderRepository') protected providerRepositoryGetter: Getter<ProviderRepository>, @repository.getter('BrandRepository') protected brandRepositoryGetter: Getter<BrandRepository>, @repository.getter('QuotationProductsRepository') protected quotationProductsRepositoryGetter: Getter<QuotationProductsRepository>, @repository.getter('QuotationRepository') protected quotationRepositoryGetter: Getter<QuotationRepository>, @repository.getter('ClassificationRepository') protected classificationRepositoryGetter: Getter<ClassificationRepository>, @repository.getter('LineRepository') protected lineRepositoryGetter: Getter<LineRepository>, @repository.getter('DocumentRepository') protected documentRepositoryGetter: Getter<DocumentRepository>,
  ) {
    super(Product, dataSource);
    this.document = this.createHasOneRepositoryFactoryFor('document', documentRepositoryGetter);
    this.registerInclusionResolver('document', this.document.inclusionResolver);
    this.line = this.createBelongsToAccessorFor('line', lineRepositoryGetter,);
    this.registerInclusionResolver('line', this.line.inclusionResolver);
    this.classification = this.createBelongsToAccessorFor('classification', classificationRepositoryGetter,);
    this.registerInclusionResolver('classification', this.classification.inclusionResolver);
    this.quotationProducts = this.createHasOneRepositoryFactoryFor('quotationProducts', quotationProductsRepositoryGetter);
    this.registerInclusionResolver('quotationProducts', this.quotationProducts.inclusionResolver);
    this.quotations = this.createHasManyThroughRepositoryFactoryFor('quotations', quotationRepositoryGetter, quotationProductsRepositoryGetter,);
    this.registerInclusionResolver('quotations', this.quotations.inclusionResolver);
    this.brand = this.createBelongsToAccessorFor('brand', brandRepositoryGetter,);
    this.registerInclusionResolver('brand', this.brand.inclusionResolver);
    this.provider = this.createBelongsToAccessorFor('provider', providerRepositoryGetter,);
    this.registerInclusionResolver('provider', this.provider.inclusionResolver);
    this.definePersistedModel(Product)
    this.modelClass.observe('before save', async (ctx: any) => {
      const hook = await this.operationHook();
      await hook.beforeSave(this, ctx, LogModelName.PRODUCT);
    });
    this.organization = this.createBelongsToAccessorFor('organization', organizationRepositoryGetter,);
    this.registerInclusionResolver('organization', this.organization.inclusionResolver);
  }
}
