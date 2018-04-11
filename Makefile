JS = $(shell find src/ -name "*.js")
BUILD = $(patsubst src/%.js, build/%.js, $(JS))

proxyworker.js: $(BUILD)
	./node_modules/.bin/browserify --standalone proxyworker ./build/index.js > $@

.PHONY: clean
clean:
	rm -rf build proxyworker.js

build/%.js: src/%.js
	@mkdir -p "$(@D)"
	./node_modules/.bin/babel $< -o $@
