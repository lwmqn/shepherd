test-all:
	@mkdir ./lib/database_test
	@touch ./lib/database_test/mqtt.db
	@./node_modules/.bin/mocha -u bdd --reporter spec
.PHONY: test-all