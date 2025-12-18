# Copyright (c) 2025 Analog Devices, Inc.
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

from typing import Literal, Protocol

from pydantic import BaseModel

from cfsai_types.config.verified import VerifiedBackendConfig
from cfsai_types.support.backend import SupportedBackend


class BackendInfo(BaseModel):
    """
    Top level backend information type which backends use to tell the main 
    application who they are and how to execute them.

    Attributes:
        name: Name of the backend.
    """
    name: str


class BackendApi(Protocol):
    """
    Backend API protocol which backends can implement. This is mostly for use in 
    type definitions which the type checker can use to perform sub-structural 
    type checking.
    """

    def build(self, cfgs: VerifiedBackendConfig) -> None:
        """
        The build method accepts the verified backend configuration and generates
        the source code for all of the model configurations there in for the 
        provided target.
        
        Args:
            cfgs: Contains a list of backend level configurations containing
                details of everything the backend should process.
        """
        ...

BackendApiMethodName = Literal['build']
"""
String literal names of the backend API. Used by CLI to determine if a string 
argument is a valid API subcommand.
"""


class Backend(Protocol):
    """
    Backend protocol which backends should implement which acts as the interface
    to communicate with the main application.
    """

    @classmethod
    def info(cls) -> BackendInfo:
        """
        Information method which is used by the main application to collect 
        information about the backends.

        Returns:
            Backend information detailing who the backend is and how to execute
                it.
        """
        ...

    @classmethod
    def support(cls) -> SupportedBackend:
        """
        Interface to collect the backend support information detailing the kinds
        of configurations/targets which the backend can support. This 
        information is used to find a suitable backend for a user configuration.

        Returns:
            Backend support information for targeting.
        """
        ...

    def api(self) -> BackendApi:
        """
        Interface for the main api to gain access to the backend api which 
        actually implements the backend functionality.

        Returns:
            An instance of the `BackendApi` which the main application can use.
        """
        ...




