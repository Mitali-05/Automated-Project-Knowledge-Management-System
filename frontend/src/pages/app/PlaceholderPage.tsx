import React from 'react';
import { useLocation } from 'react-router-dom';
import { Construction } from 'lucide-react';
import { Card, CardContent } from '../../components/ui/Card';

export const PlaceholderPage: React.FC = () => {
  const location = useLocation();
  const pageName = location.pathname.split('/').pop()?.replace('-', ' ') || 'Page';

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto h-full flex flex-col items-center justify-center">
      <Card className="max-w-md w-full text-center">
        <CardContent className="pt-12 pb-12 flex flex-col items-center">
          <div className="h-16 w-16 rounded-full bg-primary-light-indigo text-primary-indigo flex items-center justify-center mb-6">
            <Construction size={32} />
          </div>
          <h2 className="text-2xl font-bold text-text-primary capitalize mb-2">
            {pageName}
          </h2>
          <p className="text-text-secondary mb-6">
            This page is currently under construction. Check back soon for updates.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
