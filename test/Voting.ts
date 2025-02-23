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
    const [owner, accountA, accountB] = await ethers.getSigners();
    const Voting = await ethers.getContractFactory("Voting");
    const voting = await Voting.deploy();
    return { voting, owner, accountA, accountB };
  }

  describe("on deploy", () => {
    it("should set the contract owner", async () => {
      const { voting, owner } = await loadFixture(deployVotingFixture);
      expect(await voting.owner()).to.equal(owner.address);
    });
  });

  describe("on vote status change", () => {
    const keys = Object.keys(WorkflowStatus).filter((v) => isNaN(Number(v)));
    let voting: any;
    let prev: number;
    let next: number;
    let tx: any;

    beforeEach(async () => {
      ({ voting } = await loadFixture(deployVotingFixture));
    });

    for (const [index, key] of keys.entries()) {
      describe(`when status changes to ${key}`, () => {
        beforeEach(async () => {
          prev = index - 1;
          next = index;

          if (key === "RegisteringVoters") {
            tx = null;
            return;
          }

          if (key === "ProposalsRegistrationStarted") {
            tx = await voting.startProposalsRegistering();
          } else if (key === "ProposalsRegistrationEnded") {
            await voting.startProposalsRegistering();
            tx = await voting.endProposalsRegistering();
          } else if (key === "VotingSessionStarted") {
            await voting.startProposalsRegistering();
            await voting.endProposalsRegistering();
            tx = await voting.startVotingSession();
          } else if (key === "VotingSessionEnded") {
            await voting.startProposalsRegistering();
            await voting.endProposalsRegistering();
            await voting.startVotingSession();
            tx = await voting.endVotingSession();
          } else if (key === "VotesTallied") {
            await voting.startProposalsRegistering();
            await voting.endProposalsRegistering();
            await voting.startVotingSession();
            await voting.endVotingSession();
            tx = await voting.tallyVotes();
          }
        });

        it(`should set the vote status to ${key}`, async () => {
          const status = await voting.workflowStatus();
          expect(status).to.equal(next);
        });

        it("should emit an event", async () => {
          if (key === "RegisteringVoters") {
            return;
          }
          await expect(tx)
            .to.emit(voting, "WorkflowStatusChange")
            .withArgs(prev, next);
        });
      });
    }
  });

  describe("addVoter", () => {
    let voting: any;
    let owner: any;
    let accountA: any;
    let accountB: any;

    beforeEach(async () => {
      ({ voting, owner, accountA, accountB } = await loadFixture(
        deployVotingFixture
      ));
      await setWorkflowStatus(voting, WorkflowStatus.RegisteringVoters);
    });

    it("should emit an event when a voter is added", async () => {
      expect(await voting.addVoter(accountB.address))
        .to.emit(voting, "VoterRegistered")
        .withArgs(accountB.address);
    });

    it("should have the status set to ProposalsRegistrationStarted", async () => {
      const status = await voting.workflowStatus();
      expect(status).to.equal(WorkflowStatus.RegisteringVoters);
    });

    it("should enable to add voter when status is ProposalsRegistrationStarted", async () => {
      await voting.addVoter(accountA.address);
      const voter = await voting.connect(accountA).getVoter(accountA.address);
      expect(voter.isRegistered).to.be.true;
    });

    it("should revert if the sender is not the owner", async () => {
      await expect(
        voting.connect(accountA).addVoter(accountB)
      ).to.be.revertedWithCustomError(voting, "OwnableUnauthorizedAccount");
    });

    it("should revert if voter is already registered", async () => {
      await voting.addVoter(accountA);
      await expect(voting.addVoter(accountA)).to.rejectedWith(
        "Already registered"
      );
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
  });
  describe("getVoter", () => {
    let voting: any;
    let owner: any;
    let accountA: any;
    let accountB: any;

    beforeEach(async () => {
      ({ voting, owner, accountA, accountB } = await loadFixture(
        deployVotingFixture
      ));
      // await setWorkflowStatus(voting, WorkflowStatus.RegisteringVoters);
    });
    it("should get a voter based on the address if sender is authorized", async () => {
      await voting.addVoter(accountA);
      await voting.addVoter(accountB);
      const result = await voting.connect(accountA).getVoter(accountB);
      expect(result.isRegistered).to.be.true;
    });

    it("should revert with message if sender is not authorized", async () => {
      await voting.addVoter(accountB);
      expect(voting.connect(accountA).getVoter(accountB)).to.revertedWith(
        "You're not a voter"
      );
    });
  });

  describe("addProposal", () => {
    let voting: any;
    let owner: any;
    let accountA: any;
    let accountB: any;

    beforeEach(async () => {
      ({ voting, owner, accountA, accountB } = await loadFixture(
        deployVotingFixture
      ));
      await voting.addVoter(accountA);
      await setWorkflowStatus(
        voting,
        WorkflowStatus.ProposalsRegistrationStarted
      );
    });

    it("should revert with message if the vote status is not correct", async () => {
      const keys = Object.keys(WorkflowStatus).filter((v) => isNaN(Number(v)));
      keys.forEach(async (key, index) => {
        if (key !== "ProposalsRegistrationStarted") {
          if (key === "RegisteringVoters") {
            setWorkflowStatus(voting, WorkflowStatus.RegisteringVoters);
            expect(await voting.addVoter(accountA.address)).to.revertedWith(
              "Proposals are not allowed yet"
            );
          }
          if (key === "ProposalsRegistrationEnded") {
            setWorkflowStatus(
              voting,
              WorkflowStatus.ProposalsRegistrationEnded
            );
            expect(await voting.addVoter(accountA.address)).to.revertedWith(
              "Proposals are not allowed yet"
            );
          }
          if (key === "VotingSessionStarted") {
            setWorkflowStatus(voting, WorkflowStatus.VotingSessionStarted);
            expect(await voting.addVoter(accountA.address)).to.revertedWith(
              "Proposals are not allowed yet"
            );
          }
          if (key === "VotingSessionEnded") {
            setWorkflowStatus(voting, WorkflowStatus.VotingSessionEnded);
            expect(await voting.addVoter(accountA.address)).to.revertedWith(
              "Proposals are not allowed yet"
            );
          }
          if (key === "VotesTallied") {
            setWorkflowStatus(voting, WorkflowStatus.VotesTallied);
            expect(await voting.addVoter(accountA.address)).to.revertedWith(
              "Proposals are not allowed yet"
            );
          }
        }
      });
    });

    it("should revert with message if sender is not a voter", async () => {
      await expect(
        voting.connect(accountB).addProposal("test proposal")
      ).to.revertedWith("You're not a voter");
    });

    it("should revert with message if proposal is an empty string", async () => {
      await expect(voting.connect(accountA).addProposal("")).to.revertedWith(
        "Proposal cannot be empty"
      );
    });
    it("should emit an event when proposal is added", async () => {
      await expect(voting.connect(accountA).addProposal("test proposal"))
        .to.emit(voting, "ProposalRegistered")
        .withArgs(1);
    });
  });

  describe("getOneProposal", () => {
    let voting: any;
    let owner: any;
    let accountA: any;
    let accountB: any;

    beforeEach(async () => {
      ({ voting, owner, accountA, accountB } = await loadFixture(
        deployVotingFixture
      ));

      let voter;
      try {
        voter = await voting.getVoter(accountA.address);
      } catch {
        voter = null;
      }

      if (!voter || !voter.isRegistered) {
        await setWorkflowStatus(voting, WorkflowStatus.RegisteringVoters);
        await voting.addVoter(accountA);
      }

      await setWorkflowStatus(
        voting,
        WorkflowStatus.ProposalsRegistrationStarted
      );
      await voting.connect(accountA).addProposal("test proposal");
    });

    it("should revert with error if sender is not a voter", async () => {
      await expect(voting.connect(accountB).getOneProposal(1)).to.revertedWith(
        "You're not a voter"
      );
    });

    it("should return the proposal related to the id", async () => {
      const result = await voting.connect(accountA).getOneProposal(1);
      expect(result.description).to.be.equal("test proposal");
    });
  });

  describe("setVote", () => {
    let voting: any;
    let owner: any;
    let accountA: any;
    let accountB: any;

    beforeEach(async () => {
      ({ voting, owner, accountA, accountB } = await loadFixture(
        deployVotingFixture
      ));

      const voter = await voting.getVoter(accountA.address);
      if (!voter.isRegistered) {
        await setWorkflowStatus(voting, WorkflowStatus.RegisteringVoters);
        await voting.addVoter(accountA);
      }

      await setWorkflowStatus(
        voting,
        WorkflowStatus.ProposalsRegistrationStarted
      );
      await voting.connect(accountA).addProposal("test proposal");
      await setWorkflowStatus(
        voting,
        WorkflowStatus.ProposalsRegistrationEnded
      );
      await setWorkflowStatus(voting, WorkflowStatus.VotingSessionStarted);
    });

    it("should revert with message if the vote status is not correct", async () => {
      const keys = Object.keys(WorkflowStatus).filter((v) => isNaN(Number(v)));
      keys.forEach(async (key, index) => {
        if (key !== "VotingSessionStarted") {
          if (key === "RegisteringVoters") {
            setWorkflowStatus(voting, WorkflowStatus.RegisteringVoters);
            expect(await voting.addVoter(accountA.address)).to.revertedWith(
              "Voting session havent started yet"
            );
          }
          if (key === "ProposalsRegistrationStarted") {
            setWorkflowStatus(
              voting,
              WorkflowStatus.ProposalsRegistrationStarted
            );
            expect(await voting.addVoter(accountA.address)).to.revertedWith(
              "Voting session havent started yet"
            );
          }
          if (key === "ProposalsRegistrationEnded") {
            setWorkflowStatus(
              voting,
              WorkflowStatus.ProposalsRegistrationEnded
            );
            expect(await voting.addVoter(accountA.address)).to.revertedWith(
              "Voting session havent started yet"
            );
          }
          if (key === "VotingSessionEnded") {
            setWorkflowStatus(voting, WorkflowStatus.VotingSessionEnded);
            expect(await voting.addVoter(accountA.address)).to.revertedWith(
              "Voting session havent started yet"
            );
          }
          if (key === "VotesTallied") {
            setWorkflowStatus(voting, WorkflowStatus.VotesTallied);
            expect(await voting.addVoter(accountA.address)).to.revertedWith(
              "Voting session havent started yet"
            );
          }
        }
      });
    });
    it("should revert with an error if sender is not a voter", async () => {
      await expect(voting.connect(accountB).setVote(1)).to.revertedWith(
        "You're not a voter"
      );
    });
    it("should revert with an error with if voter already voted", async () => {
      await voting.connect(accountA).setVote(1);
      await expect(voting.connect(accountA).setVote(1)).to.rejectedWith(
        "You have already voted"
      );
    });
    it("should revert with an error if the proposal id is not retrieved", async () => {
      await expect(voting.connect(accountA).setVote(2)).to.revertedWith(
        "Proposal not found"
      );
    });
    it("should bind the proposal id to the voter", async () => {
      await voting.connect(accountA).setVote(1);
      const voter = await voting.connect(accountA).getVoter(accountA);
      expect(voter.votedProposalId.toString()).to.be.equal("1");
    });
    it("should declare that the voter has voted", async () => {
      await voting.connect(accountA).setVote(1);
      const voter = await voting.connect(accountA).getVoter(accountA);
      expect(voter.hasVoted).to.be.true;
    });
    it("should increment the vote count for the proposal", async () => {
      await voting.connect(accountA).setVote(1);
      const proposal = await voting.connect(accountA).getOneProposal(1);
      expect(proposal.voteCount.toString()).to.be.equal("1");
    });
    it("should emit an event", async () => {
      await expect(voting.connect(accountA).setVote(1))
        .to.emit(voting, "Voted")
        .withArgs(accountA.address, 1);
    });
  });
  describe("tallyVotes", () => {});
});
