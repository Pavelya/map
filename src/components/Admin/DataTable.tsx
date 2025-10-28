'use client';

import React from 'react';
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
  type PaginationState,
} from '@tanstack/react-table';
import { ChevronUp, ChevronDown, ChevronsUpDown, ChevronLeft, ChevronRight } from 'lucide-react';

interface DataTableProps<TData> {
  columns: ColumnDef<TData>[];
  data: TData[];
  loading?: boolean;
  emptyMessage?: string;
  pagination?: {
    pageIndex: number;
    pageSize: number;
    total: number;
    onPaginationChange: (pagination: PaginationState) => void;
  };
  manualPagination?: boolean;
}

export function DataTable<TData>({
  columns,
  data,
  loading = false,
  emptyMessage = 'No data available',
  pagination,
  manualPagination = false,
}: DataTableProps<TData>) {
  const [sorting, setSorting] = React.useState<SortingState>([]);

  const paginationState = pagination
    ? {
        pageIndex: pagination.pageIndex,
        pageSize: pagination.pageSize,
      }
    : { pageIndex: 0, pageSize: 20 };

  const tableConfig: any = {
    data,
    columns,
    state: {
      sorting,
      ...(pagination && { pagination: paginationState }),
    },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    manualPagination,
  };

  if (pagination) {
    tableConfig.onPaginationChange = pagination.onPaginationChange;
    if (manualPagination) {
      tableConfig.pageCount = Math.ceil(pagination.total / pagination.pageSize);
    }
  }

  if (!manualPagination) {
    tableConfig.getPaginationRowModel = getPaginationRowModel();
  }

  const table = useReactTable(tableConfig);

  if (loading) {
    return (
      <div className="w-full border border-gray-800 rounded-lg overflow-hidden">
        <div className="animate-pulse">
          <div className="bg-gray-900 h-12 border-b border-gray-800" />
          {[...Array(5)].map((_, i) => (
            <div key={i} className="bg-gray-950 h-16 border-b border-gray-800" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-4">
      <div className="border border-gray-800 rounded-lg overflow-hidden">
        <table className="w-full" role="table" aria-label="Data table">
          <thead className="bg-gray-900 border-b border-gray-800">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider"
                    style={{ width: header.getSize() }}
                  >
                    {header.isPlaceholder ? null : (
                      <div
                        className={
                          header.column.getCanSort()
                            ? 'flex items-center gap-2 cursor-pointer select-none hover:text-gray-200'
                            : 'flex items-center gap-2'
                        }
                        onClick={header.column.getToggleSortingHandler()}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            header.column.getToggleSortingHandler()?.(e as any);
                          }
                        }}
                        role={header.column.getCanSort() ? 'button' : undefined}
                        tabIndex={header.column.getCanSort() ? 0 : undefined}
                        aria-sort={
                          header.column.getIsSorted()
                            ? header.column.getIsSorted() === 'asc'
                              ? 'ascending'
                              : 'descending'
                            : 'none'
                        }
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {header.column.getCanSort() && (
                          <span className="text-gray-500">
                            {header.column.getIsSorted() === 'asc' ? (
                              <ChevronUp size={16} />
                            ) : header.column.getIsSorted() === 'desc' ? (
                              <ChevronDown size={16} />
                            ) : (
                              <ChevronsUpDown size={16} />
                            )}
                          </span>
                        )}
                      </div>
                    )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="bg-gray-950 divide-y divide-gray-800">
            {table.getRowModel().rows.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-6 py-12 text-center text-gray-500"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <tr key={row.id} className="hover:bg-gray-900 transition-colors">
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-6 py-4 text-sm text-gray-300">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {pagination && table.getPageCount() > 1 && (
        <div className="flex items-center justify-between px-2">
          <div className="text-sm text-gray-400">
            Showing{' '}
            <span className="font-medium text-gray-200">
              {pagination.pageIndex * pagination.pageSize + 1}
            </span>{' '}
            to{' '}
            <span className="font-medium text-gray-200">
              {Math.min((pagination.pageIndex + 1) * pagination.pageSize, pagination.total)}
            </span>{' '}
            of <span className="font-medium text-gray-200">{pagination.total}</span> results
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() =>
                pagination.onPaginationChange({
                  pageIndex: pagination.pageIndex - 1,
                  pageSize: pagination.pageSize,
                })
              }
              disabled={pagination.pageIndex === 0}
              className="px-3 py-2 text-sm font-medium text-gray-300 bg-gray-900 border border-gray-700 rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              aria-label="Previous page"
            >
              <ChevronLeft size={16} />
            </button>

            <span className="text-sm text-gray-400">
              Page{' '}
              <span className="font-medium text-gray-200">{pagination.pageIndex + 1}</span> of{' '}
              <span className="font-medium text-gray-200">
                {Math.ceil(pagination.total / pagination.pageSize)}
              </span>
            </span>

            <button
              onClick={() =>
                pagination.onPaginationChange({
                  pageIndex: pagination.pageIndex + 1,
                  pageSize: pagination.pageSize,
                })
              }
              disabled={
                pagination.pageIndex >= Math.ceil(pagination.total / pagination.pageSize) - 1
              }
              className="px-3 py-2 text-sm font-medium text-gray-300 bg-gray-900 border border-gray-700 rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              aria-label="Next page"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
