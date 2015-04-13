proxyworker.js: index.js node_modules
	./node_modules/.bin/babel index.js \
		--modules amd \
		--out-file proxyworker.js \
		--source-maps \
		--stage 0
	cat ./node_modules/babel-core/browser-polyfill.js proxyworker.js > /tmp/proxyworker.js
	mv /tmp/proxyworker.js proxyworker.js

node_modules: package.json
	npm install

.PHONY: clean
clean:
	rm -rf node_modules proxyworker.js proxyworker.js.map
