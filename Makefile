test-all:
	@mkdir ./lib/database_test
	@touch ./lib/database_test/mqtt.db
	@./node_modules/.bin/mocha -u bdd --reporter spec
	@rm ./lib/database_test/mqtt.db
	@rm -rf ./lib/database_test
.PHONY: test-all