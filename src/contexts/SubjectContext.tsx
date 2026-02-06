import React, { createContext, useContext, useState } from 'react';

type SubjectContextType = {
  currentSubjectId: string | null;
  setCurrentSubjectId: (id: string | null) => void;
};

const SubjectContext = createContext<SubjectContextType | undefined>(undefined);

export const SubjectProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentSubjectId, setCurrentSubjectId] = useState<string | null>(null);

  return (
    <SubjectContext.Provider value={{ currentSubjectId, setCurrentSubjectId }}>
      {children}
    </SubjectContext.Provider>
  );
};

export const useSubject = () => {
  const ctx = useContext(SubjectContext);
  if (!ctx) throw new Error('useSubject must be used within SubjectProvider');
  return ctx;
};