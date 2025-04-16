export interface NavigationItem {
  label: string;
  path: string;
  icon: string;
  children?: NavigationItem[];
}

export interface NavigationSection {
  title: string;
  items: NavigationItem[];
}