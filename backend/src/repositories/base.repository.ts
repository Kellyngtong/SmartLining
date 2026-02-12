import { PrismaClient } from '@prisma/client';

/**
 * Base Repository Pattern for type-safe data access
 * Provides common CRUD operations and filtering capabilities
 */
export abstract class BaseRepository<T, CreateDTO, UpdateDTO> {
  constructor(protected prisma: PrismaClient) {}

  /**
   * Find a record by ID
   */
  abstract findById(id: number): Promise<T | null>;

  /**
   * Find all records with optional pagination
   */
  abstract findAll(options?: { skip?: number; take?: number }): Promise<T[]>;

  /**
   * Create a new record
   */
  abstract create(data: CreateDTO): Promise<T>;

  /**
   * Update an existing record
   */
  abstract update(id: number, data: UpdateDTO): Promise<T | null>;

  /**
   * Delete a record by ID
   */
  abstract delete(id: number): Promise<boolean>;

  /**
   * Count total records
   */
  abstract count(): Promise<number>;
}

/**
 * Helper function for pagination
 */
export function getPaginationParams(page: number = 1, limit: number = 10) {
  const skip = (page - 1) * limit;
  return { skip, take: limit };
}

/**
 * Helper function to format paginated response
 */
export function formatPaginatedResponse<T>(data: T[], total: number, page: number, limit: number) {
  return {
    data,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}
