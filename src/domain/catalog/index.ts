import type { Catalog } from '../types'
import { articles } from './articles'
import { tentTypes } from './tents'

/** Der mitgelieferte Katalog: Artikel und Zelttypen. */
export const catalog: Catalog = { articles, tentTypes }
