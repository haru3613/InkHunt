import { mergeTests } from '@playwright/test'
import { test as authTest } from './auth.fixture'
import { test as apiMockTest } from './api-mocks.fixture'

export const test = mergeTests(authTest, apiMockTest)
export { expect } from '@playwright/test'
