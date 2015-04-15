JS := $(shell find lib/ -name "*.js")

proxyworker.js: $(JS) node_modules
	./node_modules/.bin/browserify \
		--standalone proxyworker \
		./lib/index.js > ./proxyworker.js

node_modules: package.json
	npm install

.PHONY: clean
clean:
	rm -rf build proxyworker.js
