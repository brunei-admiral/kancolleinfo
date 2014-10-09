# -*- Ruby -*-

DEPENDS = %w[chrome.manifest content defaults install.rdf]

desc "make package"
task :pack do
  ver = File.read("install.rdf")[%r"<em:version>(.*)</em:version>", 1]
  file = "kancolleinfo_#{ver}.xpi"
  raise "file `#{file}' already exists." if File.exist?(file)

  sh "zip -r -9 #{file} #{DEPENDS.join(' ')}"
end

task :style do
  puts File.read("index.html", encoding: 'utf-8').lines.grep(/^\#kancolle-info/).map{|e| "      sheet.insertRule('#{e.chomp}', sheet.length);"}
end
