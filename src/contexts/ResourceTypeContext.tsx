import React, { createContext, useContext, useState } from 'react';

type ResourceType = 'books' | 'slides' | 'notes' | 'pyqs';

type ResourceTypeContextType = {
  activeResourceType: ResourceType;
  setActiveResourceType: (type: ResourceType) => void;
};

const ResourceTypeContext = createContext<ResourceTypeContextType | undefined>(undefined);

export const ResourceTypeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeResourceType, setActiveResourceType] = useState<ResourceType>('books');

  return (
    <ResourceTypeContext.Provider value={{ activeResourceType, setActiveResourceType }}>
      {children}
    </ResourceTypeContext.Provider>
  );
};

export const useResourceType = () => {
  const ctx = useContext(ResourceTypeContext);
  if (!ctx) throw new Error('useResourceType must be used within ResourceTypeProvider');
  return ctx;
};
