{ pkgs }: {
  deps = [
    pkgs.nodejs
    pkgs.puppeteer
    pkgs.glib  # This includes libglib, necessary for Puppeteer
  ];
}
