import {belongsTo, Entity, model, property} from '@loopback/repository';
import {InventoriesIssueE, InventoriesReasonE, InventoryMovementsTypeE} from '../enums';
import {Inventories} from './inventories.model';
import {Project} from './project.model';

@model({
    settings: {
        postgresql: {
            table: 'inventories_InventoryMovements' // Nombre de la tabla en PostgreSQL
        },
        foreignKeys: {
            fk_project_projectid: {
                name: 'fk_project_projectid',
                entity: 'Project',
                entityKey: 'id',
                foreignKey: 'projectid',
            },
            fk_inventories_inventoriesid: {
                name: 'fk_inventories_inventoriesid',
                entity: 'Inventories',
                entityKey: 'id',
                foreignKey: 'inventoriesid',
            },
        }
    }
})
export class InventoryMovements extends Entity {
    @property({
        type: 'number',
        id: true,
        generated: true,
    })
    id?: number;

    @property({
        type: 'date',
        default: () => new Date(),
    })
    createdAt: Date;

    //Cantidad
    @property({
        type: 'number',
    })
    quantity: number;

    //Relacion a proyecto
    @belongsTo(() => Project)
    projectId: number;

    //Tipo (entrada/salida)
    @property({
        type: 'string',
        jsonSchema: {
            enum: [...Object.values(InventoryMovementsTypeE)],
        },
    })
    type: InventoryMovementsTypeE;

    @belongsTo(() => Inventories)
    inventoriesId: number;

    //Motivo Entrad
    @property({
        type: 'string',
        jsonSchema: {
            enum: [...Object.values(InventoriesReasonE)],
        },
    })
    reasonEntry: InventoriesReasonE;

    //Motivo Salida
    @property({
        type: 'string',
        jsonSchema: {
            enum: [...Object.values(InventoriesIssueE)],
        },
    })
    reasonIssue: InventoriesIssueE;

    //Sucursal destino
    @property({
        type: 'number',
    })
    destinationBranchId: number;

    //Comentario
    @property({
        type: 'string',
    })
    comment: string;

    //Número de contenedor
    @property({
        type: 'string',
    })
    containerNumber: string;

    //Número de recoleccion
    @property({
        type: 'string',
    })
    collectionNumber: string;

    constructor(data?: Partial<InventoryMovements>) {
        super(data);
    }
}

export interface InventoryMovementsRelations {
    // describe navigational properties here
}

export type InventoryMovementsWithRelations = InventoryMovements & InventoryMovementsRelations;
