import { ErrorIF, ManufacturedHomeSearchResultIF, SearchCriteriaIF, SearchResultIF } from '@/interfaces'

// Search Query response (search step 1) interface.
export interface SearchResponseIF {
  searchId: string,
  exactResultsSize?: number,
  maxResultsSize: number,
  returnedResultsSize: number,
  selectedResultsSize?: number,
  totalResultsSize: number,
  searchDateTime?: string, // UTC ISO formatted date and time.
  searchQuery: SearchCriteriaIF, // Echoes request
  results: SearchResultIF[],
  error?: ErrorIF,
  inProgress?: boolean,
  loadingPDF?: boolean,
  isPdfRequested?: boolean, // UX flag for large searches (to display PDF icon on first load)
  userId?: string,
  username?: string
}

export interface ManufacturedHomeSearchResponseIF {
  searchId: string,
  totalResultsSize: number,
  selectedResultsSize?: number,
  searchDateTime?: string, // UTC ISO formatted date and time.
  searchQuery: SearchCriteriaIF, // Echoes request
  results: ManufacturedHomeSearchResultIF[],
  error?: ErrorIF,
  inProgress?: boolean,
  loadingPDF?: boolean,
  userId?: string,
  username?: string
}
