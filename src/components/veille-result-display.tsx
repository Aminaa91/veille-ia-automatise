"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  FileText, 
  TrendingUp, 
  Users, 
  AlertCircle, 
  Lightbulb,
  CheckCircle
} from "lucide-react";

interface VeilleResultDisplayProps {
  content: string;
}

interface ParsedSection {
  title: string;
  content: string;
  icon?: React.ReactNode;
  color?: string;
}

export const VeilleResultDisplay = ({ content }: VeilleResultDisplayProps) => {
  const parseContent = (text: string): ParsedSection[] => {
    const sections: ParsedSection[] = [];
    
    // Split by numbered sections or headers
    const lines = text.split('\n');
    let currentSection: ParsedSection | null = null;
    let currentContent: string[] = [];

    const sectionPatterns = [
      { pattern: /^#{1,3}\s*(.+)$/i, type: 'header' },
      { pattern: /^(\d+)\.\s*(.+)$/i, type: 'numbered' },
      { pattern: /^\*\*(.+?)\*\*\s*:?$/i, type: 'bold' },
      { pattern: /^(.+?)\s*:$/i, type: 'colon' }
    ];

    const getSectionIcon = (title: string) => {
      const lowerTitle = title.toLowerCase();
      if (lowerTitle.includes('résumé') || lowerTitle.includes('executive') || lowerTitle.includes('synthèse')) {
        return { icon: <FileText className="h-5 w-5" />, color: 'blue' };
      }
      if (lowerTitle.includes('tendance') || lowerTitle.includes('point') || lowerTitle.includes('clé')) {
        return { icon: <TrendingUp className="h-5 w-5" />, color: 'green' };
      }
      if (lowerTitle.includes('acteur') || lowerTitle.includes('innovation') || lowerTitle.includes('principal')) {
        return { icon: <Users className="h-5 w-5" />, color: 'purple' };
      }
      if (lowerTitle.includes('enjeu') || lowerTitle.includes('perspective') || lowerTitle.includes('risque')) {
        return { icon: <AlertCircle className="h-5 w-5" />, color: 'orange' };
      }
      if (lowerTitle.includes('recommandation') || lowerTitle.includes('conseil') || lowerTitle.includes('action')) {
        return { icon: <Lightbulb className="h-5 w-5" />, color: 'yellow' };
      }
      return { icon: <CheckCircle className="h-5 w-5" />, color: 'gray' };
    };

    const saveCurrentSection = () => {
      if (currentSection && currentContent.length > 0) {
        currentSection.content = currentContent.join('\n').trim();
        if (currentSection.content) {
          sections.push(currentSection);
        }
      }
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      if (!line) continue;

      let isNewSection = false;
      let sectionTitle = '';

      // Check if this line starts a new section
      for (const { pattern, type } of sectionPatterns) {
        const match = line.match(pattern);
        if (match) {
          if (type === 'numbered') {
            sectionTitle = match[2];
          } else if (type === 'bold') {
            sectionTitle = match[1];
          } else if (type === 'header') {
            sectionTitle = match[1];
          } else if (type === 'colon') {
            // Only treat as section if it's short enough to be a title
            if (match[1].length < 100 && !match[1].includes('.')) {
              sectionTitle = match[1];
            }
          }
          
          if (sectionTitle) {
            isNewSection = true;
            break;
          }
        }
      }

      if (isNewSection && sectionTitle) {
        // Save previous section
        saveCurrentSection();
        
        // Start new section
        const { icon, color } = getSectionIcon(sectionTitle);
        currentSection = {
          title: sectionTitle,
          content: '',
          icon,
          color
        };
        currentContent = [];
      } else if (currentSection) {
        // Add to current section
        currentContent.push(line);
      } else {
        // Before any section is found, add to a default intro section
        if (sections.length === 0) {
          currentSection = {
            title: 'Introduction',
            content: '',
            icon: <FileText className="h-5 w-5" />,
            color: 'blue'
          };
        }
        currentContent.push(line);
      }
    }

    // Save last section
    saveCurrentSection();

    return sections;
  };

  const formatContent = (text: string) => {
    // Convert bullet points
    const withBullets = text.replace(/^[-•*]\s+(.+)$/gm, '• $1');
    
    // Convert bold text
    const withBold = withBullets.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    
    // Convert italic text
    const withItalic = withBold.replace(/\*(.+?)\*/g, '<em>$1</em>');
    
    return withItalic;
  };

  const getColorClasses = (color?: string) => {
    switch (color) {
      case 'blue':
        return 'bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800 text-blue-900 dark:text-blue-100';
      case 'green':
        return 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800 text-green-900 dark:text-green-100';
      case 'purple':
        return 'bg-purple-50 dark:bg-purple-950/20 border-purple-200 dark:border-purple-800 text-purple-900 dark:text-purple-100';
      case 'orange':
        return 'bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-800 text-orange-900 dark:text-orange-100';
      case 'yellow':
        return 'bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-800 text-yellow-900 dark:text-yellow-100';
      default:
        return 'bg-gray-50 dark:bg-gray-950/20 border-gray-200 dark:border-gray-800 text-gray-900 dark:text-gray-100';
    }
  };

  const sections = parseContent(content);

  if (sections.length === 0) {
    return (
      <div className="bg-muted p-6 rounded-lg">
        <p className="text-sm whitespace-pre-wrap">{content}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {sections.map((section, index) => (
        <Card key={index} className={`border-l-4 ${getColorClasses(section.color)}`}>
          <CardContent className="pt-6">
            <div className="flex items-start gap-3 mb-4">
              <div className={`p-2 rounded-lg ${
                section.color === 'blue' ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400' :
                section.color === 'green' ? 'bg-green-100 dark:bg-green-900/50 text-green-600 dark:text-green-400' :
                section.color === 'purple' ? 'bg-purple-100 dark:bg-purple-900/50 text-purple-600 dark:text-purple-400' :
                section.color === 'orange' ? 'bg-orange-100 dark:bg-orange-900/50 text-orange-600 dark:text-orange-400' :
                section.color === 'yellow' ? 'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-600 dark:text-yellow-400' :
                'bg-gray-100 dark:bg-gray-900/50 text-gray-600 dark:text-gray-400'
              }`}>
                {section.icon}
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-semibold mb-3 flex items-center gap-2">
                  {section.title}
                  <Badge variant="outline" className="text-xs">
                    Section {index + 1}
                  </Badge>
                </h3>
                <div 
                  className="prose prose-sm max-w-none dark:prose-invert"
                  dangerouslySetInnerHTML={{ 
                    __html: formatContent(section.content)
                      .split('\n')
                      .map(line => {
                        if (line.trim().startsWith('•')) {
                          return `<li class="ml-4">${line.trim().substring(1).trim()}</li>`;
                        }
                        return `<p class="mb-2">${line}</p>`;
                      })
                      .join('')
                  }}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
