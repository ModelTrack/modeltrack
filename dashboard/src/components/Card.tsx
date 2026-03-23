interface CardProps {
  children: React.ReactNode;
  className?: string;
  padding?: 'sm' | 'md' | 'lg';
}

export default function Card({ children, className = '', padding = 'md' }: CardProps) {
  const paddings = { sm: 'p-3', md: 'p-5', lg: 'p-6' };
  return (
    <div className={`bg-gray-900 border border-gray-800 rounded-lg ${paddings[padding]} ${className}`}>
      {children}
    </div>
  );
}
