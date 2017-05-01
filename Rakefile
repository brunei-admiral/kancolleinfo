# -*- Ruby -*-

DEPENDS = %w[chrome.manifest bootstrap.js content install.rdf]

desc "make package"
task :pack => :test do
  ver = File.read("install.rdf")[%r"<em:version>(.*)</em:version>", 1]
  file = "kancolleinfo_#{ver}.xpi"
  raise "file `#{file}' already exists." if File.exist?(file)

  sh "zip -r -9 #{file} #{DEPENDS.join(' ')}"
end

desc "run test suite"
task :test do
  Dir["tests/test*.js"].each do |test|
    sh "phantomjs --output-encoding=shift_jis #{test}"
  end
end

namespace :test do
  desc "run test suite with Node.js"
  task :node do
    if ENV["NODE_DIR"]
      ENV["PATH"] = [ENV["NODE_DIR"], ENV["PATH"]].join(File::PATH_SEPARATOR)
    end
    Dir["tests/test*.js"].each do |test|
      sh "node #{test}"
    end
  end
end

desc "extract stylesheet from sample"
task :style do
  puts File.read("index.html", encoding: 'utf-8').lines.grep(/^(?:\#kancolle-info|@-moz-)/).map{|e| "      sheet.insertRule('#{e.chomp}', sheet.length);"}
end
