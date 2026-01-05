import {
  Model,
  ModelStatic,
  WhereOptions,
  FindOptions,
  Attributes,
  CreationAttributes,
  Identifier,
} from "sequelize";

/**
 * Defines the shape of a paginated result.
 * TData is the type of the plain data object, not the Model instance.
 */
export interface PageResult<TData> {
  currentPage: number;
  totalPages: number;
  totalRecords: number;
  data: TData[];
}

/**
 * A generic Data Access Object (DAO) class for Sequelize models.
 * It standardizes common database operations and returns plain JSON objects
 * instead of Sequelize model instances, making it ideal for APIs.
 */
export default class GenericDAO<T extends Model> {
  /**
   * Creates an instance of the GenericDAO.
   * @param model - The Sequelize model static class (e.g., User)
   */
  constructor(protected model: ModelStatic<T>) {}

  /**
   * Converts a Sequelize model instance into a plain JavaScript object.
   * @param model - The Sequelize model instance.
   * @returns A plain object representation of the model.
   */
  cleanModel(model: T): Attributes<T> {
    return model.toJSON() as Attributes<T>;
  }

  // === INSERT OPERATIONS ===

  /**
   * Inserts a new entity into the database.
   * @param entity - The creation attributes for the new entity.
   * @returns The newly created entity as a plain object.
   */
  async insert(entity: CreationAttributes<T>): Promise<Attributes<T> | null> {
    const result = await this.model.create(entity);
    return result.toJSON() as Attributes<T>;
  }

  /**
   * Inserts multiple entities into the database in a single query.
   * @param entities - An array of creation attributes for the new entities.
   * @returns An array of the newly created entities as plain objects.
   */
  async insertAll(
    entities: CreationAttributes<T>[]
  ): Promise<Attributes<T>[] | null> {
    if (entities.length === 0) return [];
    const results = await this.model.bulkCreate(entities);
    return results.map((r) => r.toJSON() as Attributes<T>);
  }

  // === SELECT OPERATIONS ===

  /**
   * Selects an entity by its primary key.
   * @param pk - The primary key of the entity to find.
   * @param findOptions - Optional Sequelize FindOptions (e.g., for including associations).
   * @returns The entity as a plain object, or null if not found.
   */
  async selectWherePK(
    pk: Identifier,
    findOptions?: Omit<FindOptions<Attributes<T>>, "where">
  ): Promise<Attributes<T> | null> {
    const result = await this.model.findByPk(pk, findOptions);
    return result ? (result.toJSON() as Attributes<T>) : null;
  }

  mergeOptions(findOptions: any, addedIncludes: any) {
    return {
      ...findOptions,
      include: [
        ...addedIncludes,
        // Add any includes the caller might have *also* passed
        ...(Array.isArray(findOptions?.include) ? findOptions.include : []),
      ],
    };
  }

  /**
   * Selects all entities from the table.
   * @param findOptions - Optional Sequelize FindOptions (e.g., for includes, ordering, limits).
   * @returns An array of entities as plain objects.
   */
  async selectAll(
    findOptions?: FindOptions<Attributes<T>>
  ): Promise<Attributes<T>[]> {
    const results = await this.model.findAll({ ...findOptions });

    return results.map((r) => r.toJSON() as Attributes<T>);
  }

  /**
   * Selects entities that match a specific where clause.
   * @param where - The Sequelize WhereOptions to filter by.
   * @param findOptions - Optional Sequelize FindOptions (e.g., for includes, ordering).
   * @returns An array of matching entities as plain objects.
   */
  async selectWhere(
    where: WhereOptions<Attributes<T>>,
    findOptions?: Omit<FindOptions<Attributes<T>>, "where">,
    p0?: unknown
  ): Promise<Attributes<T>[]> {
    const results = await this.model.findAll({ where, ...findOptions });
    return results.map((r) => r.toJSON() as Attributes<T>);
  }

  /**
   * Selects a paginated list of entities matching a where clause.
   * @param options - Pagination and filter options.
   * @returns A PageResult object with pagination info and data.
   */
  async selectWherePaginate({
    where = {},
    page = 1,
    limit = 10,
    findOptions,
  }: {
    where?: WhereOptions<Attributes<T>>;
    page?: number;
    limit?: number;
    findOptions?: Omit<
      FindOptions<Attributes<T>>,
      "where" | "limit" | "offset"
    >;
  }): Promise<PageResult<Attributes<T>>> {
    const offset = (page - 1) * limit;

    // Use findAndCountAll for atomic and correct counting with joins
    const { count, rows } = await this.model.findAndCountAll({
      where,
      limit,
      offset,
      ...findOptions,
    });

    return {
      currentPage: page,
      totalPages: Math.ceil(count / limit),
      totalRecords: count,
      data: rows.map((r) => r.toJSON() as Attributes<T>),
    };
  }

  async search({
    where = {},
    page = 1,
    limit = 10,
    findOptions,
  }: {
    page?: number;
    limit?: number;
    findOptions?: Omit<
      FindOptions<Attributes<T>>,
      "where" | "limit" | "offset"
    >;
    where?: WhereOptions<Attributes<T>>;
  }): Promise<PageResult<Attributes<T>>> {
    const offset = (page - 1) * limit;

    // Use findAndCountAll for atomic and correct counting with joins
    const { count, rows } = await this.model.findAndCountAll({
      where,
      limit,
      offset,
      ...findOptions,
    });

    return {
      currentPage: page,
      totalPages: Math.ceil(count / limit),
      totalRecords: count,
      data: rows.map((r) => r.toJSON() as Attributes<T>),
    };
  }

  /**
   * Counts the total number of records in the table.
   * @returns The total record count.
   */
  async count(): Promise<number> {
    return await this.model.count();
  }

  /**
   * Counts records matching a specific where clause.
   * @param where - The Sequelize WhereOptions to filter by.
   * @returns The record count.
   */
  async countWhere(where: WhereOptions<Attributes<T>>): Promise<number> {
    return await this.model.count();
  }

  // === UPDATE OPERATIONS ===

  /**
   * Saves changes to an existing Sequelize model instance.
   * @param entity - The model instance with changes to be saved.
   * @returns The updated entity as a plain object.
   */
  async update(entity: T): Promise<Attributes<T>> {
    const result = await entity.save();
    return result.toJSON() as Attributes<T>;
  }

  /**
   * Updates records matching a where clause with new data.
   * @param where - The Sequelize WhereOptions to select records to update.
   * @param updates - An object containing the new attribute values.
   * @returns The number of affected rows.
   */
  async updateWhere(
    where: WhereOptions<Attributes<T>>,
    updates: Partial<Attributes<T>>
  ): Promise<number> {
    const [affectedCount] = await this.model.update(updates, { where });
    return affectedCount;
  }

  // === DELETE OPERATIONS ===

  /**
   * Deletes an entity by its primary key.
   * @param id - The primary key of the entity to delete.
   * @returns The deleted entity as a plain object, or null if it was not found.
   */
  async deleteWherePK(id: Identifier): Promise<Attributes<T> | null> {
    // fetch the instance to call .destroy() on it.
    const entity = await this.model.findByPk(id);
    if (entity) {
      await entity.destroy();
      return entity.toJSON() as Attributes<T>;
    }
    return null;
  }

  /**
   * Deletes a given Sequelize model instance.
   * @param entity - The model instance to delete.
   * @returns The deleted entity as a plain object.
   */
  async delete(entity: T): Promise<Attributes<T> | null> {
    if (entity) {
      await entity.destroy();
      return entity.toJSON() as Attributes<T>;
    }
    return null;
  }

  /**
   * Deletes records matching a where clause.
   * @param where - The Sequelize WhereOptions to select records to delete.
   * @returns An array of the deleted entities as plain objects, or null if none were found.
   */
  async deleteWhere(
    where: WhereOptions<Attributes<T>>
  ): Promise<Attributes<T>[] | null> {
    // Fetch full instances first to return them after deletion.
    const entities = await this.selectWhere(where);
    if (entities.length > 0) {
      await this.model.destroy({ where });
      return entities;
    }
    return null;
  }
}
