# Objectives

The purpose of this test coverage is to cover as much of the codebase as possible based on three key points:

- Is the contract functional?
- Is the contract secure?
- Is the contract optimized in terms of gas consumption?

## Checklist to complete :

- [x] Add a `describe` block for each function
- [x] Add a `it` block for each instruction related to those functions (it should include modifiers)
- [x] Use a fixture for any repetitive preparation tasks related to context setup
- [ ] Create a mock contract with different types of memory allocation (less optimized)
- [ ] Test gas consumption by comparing it with the mock contract
- [ ] Test variable and function visibility

## Current coverage

![screenshot-coverage](doc/Screenshot%202025-02-24%20at%2010.28.00.png)

## Difficulties Encountered

- I experienced instability issues caused by certain loops used to test reverts in cases of incorrect status. I used ChatGPT to resolve this problem.

- I encountered issues when randomly adding accounts in `forEach`, which resulted in errors indicating that the voter had already been added. I had to create a fixture instead.

- Setting up these tests took me around ten hours.
