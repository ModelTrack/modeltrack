interface PageWrapperProps<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  isFirstLoad: boolean;
  skeleton?: React.ReactNode;
  children: (data: T) => React.ReactNode;
}

export default function PageWrapper<T>({ data, loading, error, isFirstLoad, skeleton, children }: PageWrapperProps<T>) {
  if (isFirstLoad && loading) {
    return skeleton || (
      <div className="flex items-center justify-center h-64 text-gray-500">Loading...</div>
    );
  }
  if (error && !data) {
    return (
      <div className="flex items-center justify-center h-64 text-red-400">Error: {error}</div>
    );
  }
  if (!data) return null;
  return <>{children(data)}</>;
}
