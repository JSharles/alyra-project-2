import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { ethers } from "hardhat";
import { expect } from "chai";

enum WorkflowStatus {
  RegisteringVoters,
  ProposalsRegistrationStarted,
  ProposalsRegistrationEnded,
  VotingSessionStarted,
  VotingSessionEnded,
  VotesTallied,
}

async function setWorkflowStatus(voting: any, status: WorkflowStatus) {
  switch (status) {
    case WorkflowStatus.ProposalsRegistrationStarted:
      await voting.startProposalsRegistering();
      break;
    case WorkflowStatus.ProposalsRegistrationEnded:
      await voting.endProposalsRegistering();
      break;
    case WorkflowStatus.VotingSessionStarted:
      await voting.startVotingSession();
      break;
    case WorkflowStatus.VotingSessionEnded:
      await voting.endVotingSession();
      break;
    case WorkflowStatus.VotesTallied:
      await voting.tallyVotes();
      break;
    default:
      break;
  }
}

describe("Voting", () => {
  async function deployVotingFixture() {
    const [owner, accountA] = await ethers.getSigners();
    const Voting = await ethers.getContractFactory("Voting");
    const voting = await Voting.deploy();
    return { voting, owner, accountA };
  }

  describe("on deploy", () => {
    it("should set the contract owner", async () => {
      const { voting, owner } = await loadFixture(deployVotingFixture);
      expect(await voting.owner()).to.equal(owner.address);
    });
  });

  describe("addVoter", () => {
    let voting: any;
    let owner: any;
    let accountA: any;

    beforeEach(async () => {
      ({ voting, owner, accountA } = await loadFixture(deployVotingFixture));
      await setWorkflowStatus(voting, WorkflowStatus.RegisteringVoters);
    });

    it("should have the status set to ProposalsRegistrationStarted", async () => {
      const status = await voting.workflowStatus();
      expect(status).to.equal(WorkflowStatus.ProposalsRegistrationStarted);
    });

    it("should enable to add voter when status is ProposalsRegistrationStarted", async () => {
      await voting.addVoter(accountA.address);
      const voter = await voting.connect(accountA).getVoter(accountA.address);
      expect(voter.isRegistered).to.be.true;
    });

    it("should not to be able to add new voter when status is not ProposalsRegistrationStarted", async () => {
      const keys = Object.keys(WorkflowStatus).filter((v) => isNaN(Number(v)));
      keys.forEach(async (key, index) => {
        if (key !== "RegisteringVoters") {
          if (key === "ProposalsRegistrationStarted") {
            setWorkflowStatus(
              voting,
              WorkflowStatus.ProposalsRegistrationStarted
            );
            expect(await voting.addVoter(accountA.address)).to.revertedWith(
              "Voters registration is not open yet"
            );
          }
          if (key === "ProposalsRegistrationEnded") {
            setWorkflowStatus(
              voting,
              WorkflowStatus.ProposalsRegistrationEnded
            );
            expect(await voting.addVoter(accountA.address)).to.revertedWith(
              "Voters registration is not open yet"
            );
          }
          if (key === "VotingSessionStarted") {
            setWorkflowStatus(voting, WorkflowStatus.VotingSessionStarted);
            expect(await voting.addVoter(accountA.address)).to.revertedWith(
              "Voters registration is not open yet"
            );
          }
          if (key === "VotingSessionEnded") {
            setWorkflowStatus(voting, WorkflowStatus.VotingSessionEnded);
            expect(await voting.addVoter(accountA.address)).to.revertedWith(
              "Voters registration is not open yet"
            );
          }
          if (key === "VotesTallied") {
            setWorkflowStatus(voting, WorkflowStatus.VotesTallied);
            expect(await voting.addVoter(accountA.address)).to.revertedWith(
              "Voters registration is not open yet"
            );
          }
        }
      });
    });

    it.only("should emit an event when a voter is added", async () => {
      await voting.addVoter(accountA.address);
      expect(voting).to.emit(voting, "VoterRegistered");
    });
  });
});
