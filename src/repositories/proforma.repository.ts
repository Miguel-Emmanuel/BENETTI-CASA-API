import {Getter, inject} from '@loopback/core';
import {BelongsToAccessor, DefaultCrudRepository, repository, HasOneRepositoryFactory} from '@loopback/repository';
import {DbDataSource} from '../datasources';
import {LogModelName} from '../enums';
import {OperationHookBindings} from '../keys';
import {Proforma, ProformaRelations, Provider, Brand, Document, Project} from '../models';
import {OperationHook} from '../operation-hooks';
import {ProviderRepository} from './provider.repository';
import {BrandRepository} from './brand.repository';
import {DocumentRepository} from './document.repository';
import {ProjectRepository} from './project.repository';

export class ProformaRepository extends DefaultCrudRepository<
  Proforma,
  typeof Proforma.prototype.id,
  ProformaRelations
> {

  public readonly provider: BelongsToAccessor<Provider, typeof Proforma.prototype.id>;

  public readonly brand: BelongsToAccessor<Brand, typeof Proforma.prototype.id>;

  public readonly document: HasOneRepositoryFactory<Document, typeof Proforma.prototype.id>;

  public readonly project: BelongsToAccessor<Project, typeof Proforma.prototype.id>;

  constructor(
    @inject('datasources.db') dataSource: DbDataSource,
    @inject.getter(OperationHookBindings.OPERATION_SERVICE)
    public operationHook: Getter<OperationHook>, @repository.getter('ProviderRepository') protected providerRepositoryGetter: Getter<ProviderRepository>, @repository.getter('BrandRepository') protected brandRepositoryGetter: Getter<BrandRepository>, @repository.getter('DocumentRepository') protected documentRepositoryGetter: Getter<DocumentRepository>, @repository.getter('ProjectRepository') protected projectRepositoryGetter: Getter<ProjectRepository>,
  ) {
    super(Proforma, dataSource);
    this.project = this.createBelongsToAccessorFor('project', projectRepositoryGetter,);
    this.registerInclusionResolver('project', this.project.inclusionResolver);
    this.document = this.createHasOneRepositoryFactoryFor('document', documentRepositoryGetter);
    this.registerInclusionResolver('document', this.document.inclusionResolver);
    this.brand = this.createBelongsToAccessorFor('brand', brandRepositoryGetter,);
    this.registerInclusionResolver('brand', this.brand.inclusionResolver);
    this.provider = this.createBelongsToAccessorFor('provider', providerRepositoryGetter,);
    this.registerInclusionResolver('provider', this.provider.inclusionResolver);
    this.modelClass.observe('before save', async (ctx: any) => {
      const hook = await this.operationHook();
      await hook.beforeSave(this, ctx, LogModelName.PROFORMA);
    });
  }
}
