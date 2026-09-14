import type { Specification, SpecificationSummary } from './specification.js';

export interface CreateSpecificationInput {
  /** Stable slug for the new specification (kebab-case recommended). */
  readonly id: string;
  readonly title: string;
  readonly requirements?: string;
  readonly design?: string;
  /** Markdown body for the tasks section content (without the heading). */
  readonly tasksBody?: string;
}

export interface ProviderContext {
  readonly projectRoot: string;
}

/**
 * A provider knows how one specific SDD artifact format (Kiro, the generic
 * provider, or a future one) is laid out on disk. The core engine never
 * assumes anything about that layout — it only calls this interface and
 * works with the provider-neutral models it returns.
 */
export interface SddProvider {
  /** Stable identifier, e.g. "kiro" or "generic". */
  readonly id: string;
  readonly displayName: string;

  /** Whether this provider's specification structure is present in the project at all. */
  isApplicable(ctx: ProviderContext): Promise<boolean>;

  /** Lightweight discovery of every specification this provider can find. */
  discover(ctx: ProviderContext): Promise<SpecificationSummary[]>;

  /** Full read of one specification, including requirements/design/tasks content. */
  read(ctx: ProviderContext, specId: string): Promise<Specification | undefined>;

  /** Creates a new specification using this provider's artifact layout. */
  create(ctx: ProviderContext, input: CreateSpecificationInput): Promise<Specification>;
}
