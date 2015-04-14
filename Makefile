JS := $(shell find lib/ -name "*.js")

proxyworker.js: build
	./node_modules/.bin/browserify \
		--standalone proxyworker \
		./build/index.js > ./proxyworker.js

build: $(JS) clean node_modules
	./node_modules/.bin/babel lib \
		--modules common \
		--out-dir build \
		--stage 0

node_modules: package.json
	npm install

.PHONY: clean
clean:
	rm -rf build proxyworker.js
