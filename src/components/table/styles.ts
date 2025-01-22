export const tableStyles = {
  container: 'w-full',
  wrapper: 'overflow-x-auto rounded-lg border border-gray-700 bg-gray-900',
  table: 'w-full border-collapse',
  header: {
    row: '',
    cell: 'px-3 py-2 text-xs font-medium text-gray-300 uppercase tracking-wider bg-gray-950 border-b border-gray-00'
  },
  body: {
    row: {
      base: 'transition-colors duration-150',
      clickable: 'cursor-pointer'
    },
    cell: 'px-3 py-2 text-sm border-b border-gray-700/50'
  },
  align: {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right'
  },
  states: {
    loading: 'text-center py-8 text-gray-400',
    error: 'text-center py-8 text-red-500',
    empty: 'flex flex-col items-center justify-center py-12 text-gray-400 space-y-3'
  },
  actionButton: {
    base: 'p-1.5 rounded-md bg-gray-800/50 hover:bg-gray-700/50 border border-transparent transition-all duration-150 focus:outline-none',
    view: 'text-blue-500 hover:text-white hover:border-blue-500/50 active:text-white active:border-blue-500/50 focus:border-blue-500/50',
    edit: 'text-yellow-500 hover:text-white hover:border-yellow-500/50 active:text-white active:border-yellow-500/50 focus:border-yellow-500/50',
    delete: 'text-red-500 hover:text-white hover:border-red-500/50 active:text-white active:border-red-500/50 focus:border-red-500/50'
  },
  pagination: {
    container: 'flex items-center justify-between mt-4 px-1',
    info: 'flex-1',
    controls: 'flex items-center space-x-1',
    button: {
      base: 'px-2.5 py-1 rounded text-sm transition-colors duration-150',
      active: 'bg-indigo-500 text-white hover:text-white',
      inactive: 'text-gray-400 hover:text-white hover:bg-gray-700/50',
      disabled: 'text-gray-600 cursor-not-allowed'
    },
    arrow: {
      base: 'p-1 rounded transition-colors duration-150',
      enabled: 'text-gray-400 hover:text-white hover:bg-gray-700/50',
      disabled: 'text-gray-600 cursor-not-allowed'
    }
  },
  entriesPerPage: {
    container: 'flex items-center space-x-2',
    label: 'text-sm text-gray-400',
    select: 'bg-gray-700 text-gray-100 text-sm rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-500 w-16'
  }
}; 