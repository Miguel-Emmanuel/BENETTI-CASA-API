import {Entity, belongsTo, hasMany, model, property} from '@loopback/repository';
import {ClassificationPercentageMainpm} from './classification-percentage-mainpm.model';
import {User} from './user.model';

@model({
    settings: {
        postgresql: {
            table: 'quotation_QuotationDesigner' // Nombre de la tabla en PostgreSQL
        },
        foreignKeys: {
            fk_quotation_quotationId: {
                name: 'fk_quotation_quotationId',
                entity: 'Quotation',
                entityKey: 'id',
                foreignKey: 'quotationid',
            },
            fk_user_userId: {
                name: 'fk_user_userId',
                entity: 'User',
                entityKey: 'id',
                foreignKey: 'userid',
            },
        }
    }
})
export class QuotationDesigner extends Entity {
    @property({
        type: 'number',
        id: true,
        generated: true,
    })
    id: number;

    @property({
        type: 'number',
    })
    quotationId?: number;

    @belongsTo(() => User)
    userId: number;

    @hasMany(() => ClassificationPercentageMainpm)
    classificationPercentageMainpms: ClassificationPercentageMainpm[];

    //Comision del potectista
    @property({
        type: 'number',
        required: false,
        postgresql: {
            dataType: 'double precision',
        },
    })
    commissionPercentageDesigner: number;

    constructor(data?: Partial<QuotationDesigner>) {
        super(data);
    }
}

export interface QuotationDesignerRelations {
    // describe navigational properties here
}

export type QuotationDesignerWithRelations = QuotationDesigner & QuotationDesignerRelations;
