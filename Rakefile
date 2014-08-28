# -*- Ruby -*-

DEPENDS = %w[chrome.manifest content defaults install.rdf]

desc "make package"
task :pack do
  ver = File.read("version").chomp
  file = "kancolleEx_#{ver}.xpi"
  raise "file `#{file}' already exists." if File.exist?(file)

  sh "zip -r -9 #{file} #{DEPENDS.join(' ')}"
end
