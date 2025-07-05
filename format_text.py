#!/usr/bin/env python3
"""
Script to remove **bold** formatting and reformat plant database text to be more modern and flowing.
"""

import re
import sys

def reformat_text(text):
    """
    Remove **bold** headers and reformat text to flow naturally.
    """
    # Remove **bold** patterns and replace with flowing text
    
    # Common patterns to replace with better transitions
    replacements = [
        # Size and growth patterns
        (r'\*\*Mature Size\*\*:\s*', 'This plant '),
        (r'\*\*Growth Habit\*\*:\s*', 'It features '),
        (r'\*\*Size\*\*:\s*', 'The plant '),
        
        # Cultivation patterns
        (r'\*\*Soil\*\*:\s*', 'Plant in '),
        (r'\*\*Light\*\*:\s*', 'Provide '),
        (r'\*\*Water\*\*:\s*', 'Water with '),
        (r'\*\*Temperature\*\*:\s*', 'Grows best in temperatures of '),
        (r'\*\*Climate\*\*:\s*', 'Thrives in '),
        (r'\*\*Spacing\*\*:\s*', 'Space plants '),
        (r'\*\*Fertilizer\*\*:\s*', 'Feed with '),
        (r'\*\*Location\*\*:\s*', 'Choose a location with '),
        
        # Production and timing
        (r'\*\*Production\*\*:\s*', 'Production notes: '),
        (r'\*\*Timing\*\*:\s*', 'Best timing is '),
        (r'\*\*Propagation\*\*:\s*', 'Propagate by '),
        
        # Specific care
        (r'\*\*Hawaii-specific\*\*:\s*', 'In Hawaii, '),
        (r'\*\*Container growing\*\*:\s*', 'For container growing, '),
        (r'\*\*Indoor care\*\*:\s*', 'For indoor care, '),
        (r'\*\*Maintenance\*\*:\s*', 'Maintain by '),
        
        # Pest and disease
        (r'\*\*Major pests\*\*:\s*', 'Common pests include '),
        (r'\*\*Indoor pests\*\*:\s*', 'When grown indoors, watch for '),
        (r'\*\*Diseases\*\*:\s*', 'Watch for diseases such as '),
        (r'\*\*Prevention\*\*:\s*', 'To prevent problems, '),
        (r'\*\*Sanitation\*\*:\s*', 'Maintain good sanitation by '),
        (r'\*\*Air circulation\*\*:\s*', 'Ensure good air circulation - '),
        
        # Pruning
        (r'\*\*Leaf maintenance\*\*:\s*', 'For leaf care, '),
        (r'\*\*Leaf care\*\*:\s*', 'For leaf care, '),
        (r'\*\*Post-harvest\*\*:\s*', 'After harvest, '),
        (r'\*\*Sucker management\*\*:\s*', 'Manage suckers by '),
        (r'\*\*Structure\*\*:\s*', 'For structure, '),
        (r'\*\*Training\*\*:\s*', 'Train the plant by '),
        (r'\*\*Size control\*\*:\s*', 'Control size by '),
        (r'\*\*Container pruning\*\*:\s*', 'For container plants, '),
        
        # General patterns - catch remaining **text**: with better transitions
        (r'\*\*([^*]+)\*\*:\s*', r''),
    ]
    
    result = text
    for pattern, replacement in replacements:
        result = re.sub(pattern, replacement, result)
    
    # Clean up any remaining ** patterns
    result = re.sub(r'\*\*([^*]+)\*\*', r'\1', result)
    
    # Fix common grammar issues
    result = re.sub(r'\.\s*([a-z])', lambda m: '. ' + m.group(1).upper(), result)  # Capitalize after periods
    result = re.sub(r'\s+', ' ', result)  # Multiple spaces to single
    result = re.sub(r'\.\s*([A-Z])', r'. \1', result)  # Ensure space after periods
    result = re.sub(r'([a-z])\s*([A-Z][a-z])', r'\1. \2', result)  # Add periods between sentences
    
    # Fix specific issues
    result = re.sub(r'For container growing, Excellent', 'Excellent for container growing -', result)
    result = re.sub(r'For indoor care, Can', 'Can', result)
    result = re.sub(r'In Hawaii, Perfect', 'Perfect in Hawaii', result)
    result = re.sub(r'Maintain good sanitation by Remove', 'Remove', result)
    result = re.sub(r'To prevent problems, Quarantine', 'Quarantine', result)
    result = re.sub(r'After harvest, Cut', 'Cut', result)
    result = re.sub(r'Manage suckers by Regular', 'Regular', result)
    
    result = result.strip()
    
    return result

def process_file(filename):
    """Process the plant database file."""
    with open(filename, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Find all text within quotes that contains **
    pattern = r'(general_info|cultivation_tips|pest_management|pruning_guidelines):\s*"([^"]*\*\*[^"]*)"'
    
    def replace_match(match):
        field_name = match.group(1)
        text = match.group(2)
        reformatted = reformat_text(text)
        return f'{field_name}: "{reformatted}"'
    
    new_content = re.sub(pattern, replace_match, content)
    
    with open(filename, 'w', encoding='utf-8') as f:
        f.write(new_content)
    
    print(f"Processed {filename}")

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python format_text.py <filename>")
        sys.exit(1)
    
    process_file(sys.argv[1])